import 'reflect-metadata'

import { BadRequestException } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { getModelForClass } from '@typegoose/typegoose'
import { Types } from 'mongoose'
import { ZodValidationPipe } from 'nestjs-zod'
import { describe, expect, it, vi } from 'vitest'

import {
  CATEGORY_SERVICE_TOKEN,
  DRAFT_SERVICE_TOKEN,
} from '~/constants/injection.constant'
import { registerJSONGlobal } from '~/global/json.global'
import { AuthService } from '~/modules/auth/auth.service'
import { jsonDiffStrategy } from '~/modules/draft/diff'
import type { DraftHistoryModel } from '~/modules/draft/draft.model'
import { DraftModel, DraftRefType } from '~/modules/draft/draft.model'
import { UpdateDraftSchema } from '~/modules/draft/draft.schema'
import { DraftService } from '~/modules/draft/draft.service'
import { DraftHistoryService } from '~/modules/draft/draft-history.service'
import { FileReferenceService } from '~/modules/file/file-reference.service'
import { MarkdownController } from '~/modules/markdown/markdown.controller'
import { MarkdownService } from '~/modules/markdown/markdown.service'
import { NoteModel } from '~/modules/note/note.model'
import { NoteService } from '~/modules/note/note.service'
import { PageModel } from '~/modules/page/page.model'
import { PageService } from '~/modules/page/page.service'
import { PostModel } from '~/modules/post/post.model'
import { PostService } from '~/modules/post/post.service'
import { LexicalService } from '~/processors/helper/helper.lexical.service'
import { ContentFormat } from '~/shared/types/content-format.type'
import { getModelToken } from '~/transformers/model.transformer'
import { extractImagesFromContent } from '~/utils/content.util'

import {
  fixtures,
  legacyMarkdown,
} from '../../../../../../test/editor/fixtures.mjs'

const lexical = new LexicalService()
const content = JSON.stringify(fixtures.basic)
const expectedText = lexical.lexicalToMarkdown(content)
const invalidContents = ['{broken', JSON.stringify(fixtures.invalid)]

async function services(format = ContentFormat.Lexical) {
  const history: DraftHistoryModel[] = []
  const stored = {
    id: '507f1f77bcf86cd799439011',
    title: 'Existing',
    slug: 'existing',
    categoryId: '507f1f77bcf86cd799439012',
    text: format === ContentFormat.Lexical ? 'stale' : legacyMarkdown,
    contentFormat: format,
    content: JSON.stringify(fixtures.empty),
    version: 1,
    history,
    related: [],
    save: vi.fn(),
    toObject() {
      return { ...this }
    },
    toJSON() {
      return { ...this }
    },
  }
  const model = {
    findById: vi.fn(() =>
      Object.assign(Promise.resolve(stored), {
        lean: () => Promise.resolve(stored),
      }),
    ),
    findOne: vi.fn(() =>
      Object.assign(Promise.resolve(null), {
        lean: () => Promise.resolve(null),
      }),
    ),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn((data) => Promise.resolve({ ...stored, ...data })),
    findOneAndUpdate: vi.fn((_query, data) => ({
      lean: () => Promise.resolve(Object.assign(stored, data)),
    })),
  }
  const references = { updateReferencesForDocument: vi.fn() }
  const module = await Test.createTestingModule({
    providers: [
      PostService,
      NoteService,
      PageService,
      DraftService,
      DraftHistoryService,
      LexicalService,
      ...[PostModel, NoteModel, PageModel, DraftModel].map((modelClass) => ({
        provide: getModelToken(modelClass.name),
        useValue: model,
      })),
      { provide: FileReferenceService, useValue: references },
      {
        provide: CATEGORY_SERVICE_TOKEN,
        useValue: {
          findCategoryById: vi
            .fn()
            .mockResolvedValue({ id: stored.categoryId, slug: 'category' }),
        },
      },
      { provide: DRAFT_SERVICE_TOKEN, useExisting: DraftService },
    ],
  })
    .useMocker(() => ({ emit: vi.fn(), createTracker: vi.fn() }))
    .compile()
  module.get(PostService).onApplicationBootstrap()
  return { module, model, stored, references }
}

describe('content write contract', () => {
  it('keeps partial draft updates free of format defaults', () => {
    expect(UpdateDraftSchema.parse({ content })).toEqual({ content })
  })

  it('does not normalize content on title-only updates', () => {
    const current = {
      contentFormat: ContentFormat.Lexical,
      content,
      text: 'existing',
    }
    const update: Partial<PostModel> = { title: 'Renamed' }
    expect(lexical.populateText(update, current)).toBe(false)
    expect(update).toEqual({ title: 'Renamed' })
    expect(current.content).toBe(content)
  })

  it('requires content when switching to lexical and text when switching to markdown', () => {
    expect(() =>
      lexical.populateText(
        { contentFormat: ContentFormat.Lexical },
        {
          contentFormat: ContentFormat.Markdown,
          content,
          text: legacyMarkdown,
        },
      ),
    ).toThrow(BadRequestException)
    expect(() =>
      lexical.populateText(
        { contentFormat: ContentFormat.Markdown },
        {
          contentFormat: ContentFormat.Lexical,
          content,
          text: expectedText,
        },
      ),
    ).toThrow(BadRequestException)
  })

  it('recomputes text-only lexical updates without changing JSON', () => {
    const update = { text: 'untrusted text' }
    lexical.populateText(update, {
      contentFormat: ContentFormat.Lexical,
      content,
    })
    expect(update).toEqual({ text: expectedText })
  })

  it('rejects unknown nested nodes without mutating the submitted JSON', () => {
    const invalid = JSON.stringify({
      root: {
        ...fixtures.empty.root,
        children: [
          {
            type: 'nested-doc',
            version: 1,
            content: fixtures.invalid,
          },
        ],
      },
    })
    const update = {
      contentFormat: ContentFormat.Lexical,
      content: invalid,
      text: 'before',
    }
    expect(() => lexical.populateText(update)).toThrow(
      'Unsupported Lexical node: unsupported-editor-node',
    )
    expect(update.content).toBe(invalid)
    expect(update.text).toBe('before')
  })

  it('rejects a malformed nested editor state', () => {
    const malformed = JSON.stringify({
      root: {
        ...fixtures.empty.root,
        children: [
          {
            type: 'nested-doc',
            version: 1,
            content: { broken: true },
          },
        ],
      },
    })
    expect(() => lexical.lexicalToMarkdown(malformed)).toThrow(
      BadRequestException,
    )
  })

  for (const { name, create } of [
    {
      name: 'PostService',
      create: (module: TestingModule, data: Partial<PostModel>) =>
        module.get(PostService).create(Object.assign(new PostModel(), data)),
    },
    {
      name: 'NoteService',
      create: (module: TestingModule, data: Partial<PostModel>) =>
        module.get(NoteService).create(Object.assign(new NoteModel(), data)),
    },
    {
      name: 'PageService',
      create: (module: TestingModule, data: Partial<PostModel>) =>
        module.get(PageService).create(Object.assign(new PageModel(), data)),
    },
  ]) {
    it(`${name} derives text on create`, async () => {
      const { module, model, stored } = await services()
      await create(module, {
        title: 'Created',
        slug: 'created',
        categoryId: new Types.ObjectId(stored.categoryId),
        contentFormat: ContentFormat.Lexical,
        content,
        text: 'client text',
      })
      expect(model.create.mock.calls[0][0].text).toBe(expectedText)
      await module.close()
    })

    it(`${name} rejects invalid create before persistence`, async () => {
      const { module, model } = await services()
      await expect(
        create(module, {
          contentFormat: ContentFormat.Lexical,
          content: invalidContents[1],
        }),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(model.create).not.toHaveBeenCalled()
      await module.close()
    })
  }

  for (const Service of [PostService, NoteService, PageService]) {
    it(`${Service.name} derives text for content-only updates`, async () => {
      const { module, stored } = await services()
      await module.get(Service).updateById(stored.id, { content })
      expect(stored.text).toBe(expectedText)
      expect(JSON.parse(stored.content).root.children).toHaveLength(2)
      await module.close()
    })

    it(`${Service.name} preserves old Markdown on partial updates`, async () => {
      const { module, stored } = await services(ContentFormat.Markdown)
      await module.get(Service).updateById(stored.id, { title: 'Renamed' })
      expect(stored.text).toBe(legacyMarkdown)
      expect(stored.contentFormat).toBe(ContentFormat.Markdown)
      await module.close()
    })

    for (const invalid of invalidContents) {
      it(`${Service.name} rejects invalid content before writes`, async () => {
        const { module, model, stored } = await services()
        const oldContent = stored.content
        await expect(
          module.get(Service).updateById(stored.id, { content: invalid }),
        ).rejects.toBeInstanceOf(BadRequestException)
        expect(stored.save).not.toHaveBeenCalled()
        expect(model.findOneAndUpdate).not.toHaveBeenCalled()
        expect(stored.content).toBe(oldContent)
        await module.close()
      })
    }
  }

  it('draft create and update derive text using the same converter', async () => {
    const { module, stored, references } = await services()
    const draftService = module.get(DraftService)
    const created = await draftService.create({
      refType: DraftRefType.Post,
      meta: null,
      contentFormat: ContentFormat.Lexical,
      content,
      text: 'client text',
    })
    expect(created.text).toBe(expectedText)
    const updated = await draftService.update(stored.id, { content })
    expect(updated.text).toBe(expectedText)
    expect(references.updateReferencesForDocument).toHaveBeenCalledTimes(2)
    await module.close()
  })

  for (const invalid of invalidContents) {
    it('draft rejects invalid content without saving or changing history', async () => {
      const { module, model, stored } = await services()
      const service = module.get(DraftService)
      await expect(
        service.create({
          refType: DraftRefType.Post,
          meta: null,
          contentFormat: ContentFormat.Lexical,
          content: invalid,
        }),
      ).rejects.toBeInstanceOf(BadRequestException)
      await expect(
        service.update(stored.id, { content: invalid }),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(model.create).not.toHaveBeenCalled()
      expect(stored.save).not.toHaveBeenCalled()
      expect(stored.history).toEqual([])
      expect(stored.version).toBe(1)
      await module.close()
    })
  }

  it('tracks images inside nested editor states', () => {
    expect(
      extractImagesFromContent({
        text: '',
        contentFormat: ContentFormat.Lexical,
        content: JSON.stringify(fixtures.nested),
      }),
    ).toContain(fixtures.imageOnly.root.children[0].src)
  })

  it('restores lexical history through the same converter and tracks its attachments', async () => {
    const { module, stored, references } = await services()
    stored.version = 2
    stored.history.push({
      version: 1,
      title: 'Earlier',
      content,
      contentFormat: ContentFormat.Lexical,
      isFullSnapshot: true,
      savedAt: new Date(),
    })
    const restored = await module.get(DraftService).restoreVersion(stored.id, 1)
    expect(restored.text).toBe(expectedText)
    expect(references.updateReferencesForDocument).toHaveBeenCalledOnce()
    await module.close()
  })

  it('rejects invalid history without changing the draft or its history', async () => {
    const { module, stored, references } = await services()
    stored.history.push({
      version: 1,
      title: 'Invalid history',
      content: invalidContents[0],
      contentFormat: ContentFormat.Lexical,
      isFullSnapshot: true,
      savedAt: new Date(),
    })
    const history = [...stored.history]
    await expect(
      module.get(DraftService).restoreVersion(stored.id, 1),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(stored.save).not.toHaveBeenCalled()
    expect(stored.history).toEqual(history)
    expect(stored.version).toBe(1)
    expect(references.updateReferencesForDocument).not.toHaveBeenCalled()
    await module.close()
  })

  it('converts an empty root without an editor-state exception', () => {
    expect(
      lexical.lexicalToMarkdown(
        JSON.stringify({
          ...fixtures.empty,
          root: { ...fixtures.empty.root, children: [] },
        }),
      ),
    ).toBe('')
  })
})

describe('persisted draft history', () => {
  registerJSONGlobal()
  const model = getModelForClass(DraftModel)
  const baseContent = lexical.normalizeBlockIds(
    JSON.stringify(fixtures.empty),
  ).content
  const fullContent = lexical.normalizeBlockIds(content).content
  const base: DraftHistoryModel = {
    version: 1,
    title: 'Base',
    contentFormat: ContentFormat.Lexical,
    content: baseContent,
    isFullSnapshot: true,
    savedAt: new Date('2026-01-01'),
  }

  async function restoreService(entry: DraftHistoryModel) {
    const stored = model.hydrate({
      _id: new Types.ObjectId(),
      refType: DraftRefType.Post,
      title: 'Current Markdown',
      contentFormat: ContentFormat.Markdown,
      text: legacyMarkdown,
      content: baseContent,
      version: 3,
      history: [entry, base],
    })
    const save = vi.spyOn(stored, 'save').mockResolvedValue(stored)
    const references = { updateReferencesForDocument: vi.fn() }
    const module = await Test.createTestingModule({
      providers: [
        DraftService,
        DraftHistoryService,
        LexicalService,
        {
          provide: getModelToken(DraftModel.name),
          useValue: { findById: vi.fn().mockResolvedValue(stored) },
        },
        { provide: FileReferenceService, useValue: references },
      ],
    }).compile()
    return { module, stored, save, references }
  }

  for (const kind of ['snapshot', 'diff', 'reference'] as const) {
    it(`restores ${kind} fields from Mongoose history subdocuments`, async () => {
      const restoredContent = kind === 'reference' ? baseContent : fullContent
      const entry: DraftHistoryModel = {
        ...base,
        version: 2,
        title: 'Restored Lexical',
        typeSpecificData: JSON.stringify({ mood: 'restored' }),
        isFullSnapshot: kind === 'snapshot',
        content:
          kind === 'snapshot'
            ? fullContent
            : kind === 'diff'
              ? jsonDiffStrategy.createPatch(baseContent, fullContent)
              : undefined,
        refVersion: kind === 'reference' ? 1 : undefined,
        baseVersion: kind === 'snapshot' ? undefined : 1,
      }
      const { module, stored, save, references } = await restoreService(entry)
      try {
        const restored = await module
          .get(DraftService)
          .restoreVersion(stored.id, 2)
        expect(restored).toMatchObject({
          title: entry.title,
          contentFormat: ContentFormat.Lexical,
          content: restoredContent,
          text: lexical.lexicalToMarkdown(restoredContent),
          typeSpecificData: entry.typeSpecificData,
          version: 4,
        })
        expect(restored.history[0]).toMatchObject({
          version: 3,
          title: 'Current Markdown',
          contentFormat: ContentFormat.Markdown,
        })
        expect(save).toHaveBeenCalledOnce()
        expect(references.updateReferencesForDocument).toHaveBeenCalledOnce()
      } finally {
        await module.close()
      }
    })
  }

  for (const kind of ['snapshot', 'diff'] as const) {
    it(`rejects invalid ${kind} content before mutating a Mongoose draft`, async () => {
      const invalid = invalidContents[1]
      const { module, stored, save, references } = await restoreService({
        ...base,
        version: 2,
        isFullSnapshot: kind === 'snapshot',
        content:
          kind === 'snapshot'
            ? invalid
            : jsonDiffStrategy.createPatch(baseContent, invalid),
        baseVersion: kind === 'diff' ? 1 : undefined,
      })
      const before = stored.toObject()
      try {
        await expect(
          module.get(DraftService).restoreVersion(stored.id, 2),
        ).rejects.toBeInstanceOf(BadRequestException)
        expect(stored.toObject()).toEqual(before)
        expect(save).not.toHaveBeenCalled()
        expect(references.updateReferencesForDocument).not.toHaveBeenCalled()
      } finally {
        await module.close()
      }
    })
  }
})

describe('preview HTTP contract', () => {
  it('requires authentication and never invokes the persistence service', async () => {
    const auth = {
      getSessionUser: vi.fn().mockResolvedValue(null),
      getApiKeyFromRequest: vi.fn().mockReturnValue(null),
    }
    const markdownService = {
      insertPostsToDb: vi.fn(),
      insertNotesToDb: vi.fn(),
    }
    const module = await Test.createTestingModule({
      controllers: [MarkdownController],
      providers: [
        LexicalService,
        { provide: MarkdownService, useValue: markdownService },
        { provide: AuthService, useValue: auth },
      ],
    }).compile()
    const app = module.createNestApplication(new FastifyAdapter())
    app.useGlobalPipes(new ZodValidationPipe())
    await app.init()
    const http = app.getHttpAdapter().getInstance()
    await http.ready()
    const payload = {
      contentFormat: ContentFormat.Lexical,
      content,
      text: 'client text',
    }
    try {
      const unauthorized = await http.inject({
        method: 'POST',
        url: '/markdown/preview',
        payload,
      })
      expect(unauthorized.statusCode).toBe(401)
      auth.getSessionUser.mockResolvedValue({ user: { role: 'owner' } })
      const preview = await http.inject({
        method: 'POST',
        url: '/markdown/preview',
        payload,
      })
      expect(preview.statusCode).toBe(201)
      expect(preview.json()).toEqual({ text: expectedText })

      const markdown = await http.inject({
        method: 'POST',
        url: '/markdown/preview',
        payload: {
          contentFormat: ContentFormat.Markdown,
          text: legacyMarkdown,
        },
      })
      expect(markdown.json()).toEqual({ text: legacyMarkdown })

      for (const invalid of [
        { content },
        { contentFormat: 'unknown', content },
        { contentFormat: ContentFormat.Markdown },
        { contentFormat: ContentFormat.Lexical },
        ...invalidContents.map((content) => ({
          contentFormat: ContentFormat.Lexical,
          content,
        })),
      ]) {
        const result = await http.inject({
          method: 'POST',
          url: '/markdown/preview',
          payload: invalid,
        })
        expect(result.statusCode).toBe(400)
        expect(result.body).not.toContain('{broken')
      }
      expect(markdownService.insertPostsToDb).not.toHaveBeenCalled()
      expect(markdownService.insertNotesToDb).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})
