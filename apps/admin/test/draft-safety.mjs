import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { mock } from 'node:test'
import { createRenderer, reactive } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '~/api') {
      return nextResolve(
        new URL('../src/api/index.ts', import.meta.url).href,
        context,
      )
    }
    if (specifier.startsWith('~/')) {
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      )
    }
    return nextResolve(specifier, context)
  },
})

const requests = []
const draftsApi = Object.fromEntries(
  ['create', 'update', 'getById', 'getByRef'].map((method) => [
    method,
    (...args) => {
      const deferred = Promise.withResolvers()
      requests.push({ method, args, ...deferred })
      return deferred.promise
    },
  ]),
)
mock.module(new URL('../src/api/index.ts', import.meta.url).href, {
  exports: { draftsApi },
})
const { useServerDraft } = await import('../src/hooks/use-server-draft.ts')
const renderer = createRenderer({
  createComment: () => ({}),
  insert() {},
  remove() {},
  parentNode() {},
  nextSibling() {},
})
function mount(content = {}) {
  requests.length = 0
  const data = reactive({
    title: '',
    text: '',
    typeSpecificData: {},
    ...content,
  })
  let draft
  const app = renderer.createApp({
    setup() {
      draft = useServerDraft('post', {
        getData: () => ({
          title: data.title,
          text: data.text,
          contentFormat: data.contentFormat,
          content: data.content,
          images: data.images,
          meta: data.meta,
          typeSpecificData: data.typeSpecificData,
        }),
        onTitleFallback: (title) => {
          data.title = title
        },
      })
      return () => null
    },
  })
  app.mount({})
  return { data, draft, unmount: () => app.unmount() }
}
const response = (version) => ({ id: 'test-draft', version })
const failures = []
async function check(name, run) {
  try {
    await run()
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.message}`)
  }
}

await check(
  'image-only content is dirty and saved with a fallback title',
  async () => {
    const ctx = mount({
      contentFormat: 'lexical',
      content: JSON.stringify({
        root: { type: 'root', children: [{ type: 'image', src: '/test.png' }] },
      }),
    })
    try {
      assert.equal(ctx.draft.checkIsSynced(), false)
      const saving = ctx.draft.saveImmediately()
      assert.equal(requests.length, 1)
      assert.equal(requests[0].args[0].title, 'Untitled')
      requests[0].resolve(response(1))
      await saving
      assert.equal(ctx.draft.checkIsSynced(), true)
    } finally {
      ctx.unmount()
    }
  },
)
for (const initialize of [
  'loadDraftById',
  'loadDraftByRef',
  'syncMemory',
  'saveImmediately',
]) {
  await check(
    `${initialize} ignores derived lexical text but preserves content and metadata changes`,
    async () => {
      const ctx = mount()
      const serverData = {
        title: 'Image draft',
        text: '![](/test.png)',
        contentFormat: 'lexical',
        content: JSON.stringify({
          root: {
            type: 'root',
            children: [{ type: 'image', src: '/test.png' }],
          },
        }),
        images: [],
        meta: {},
        typeSpecificData: { tags: ['first'] },
      }
      mock.timers.enable({ apis: ['setInterval'] })
      try {
        if (initialize.startsWith('loadDraft')) {
          const loading =
            initialize === 'loadDraftById'
              ? ctx.draft.loadDraftById('test-draft')
              : ctx.draft.loadDraftByRef('post', 'test-post')
          requests[0].resolve({
            ...serverData,
            ...response(1),
            updated: '2026-10-14T00:00:00.000Z',
          })
          await loading
          Object.assign(ctx.data, serverData)
        } else {
          Object.assign(ctx.data, serverData)
          const initialized = ctx.draft[initialize]()
          if (initialize === 'saveImmediately') requests[0].resolve(response(1))
          await initialized
        }
        assert.equal(ctx.draft.checkIsSynced(), true)

        // RichEditor emits this textChange when its native transformers omit images.
        ctx.data.text = ''
        assert.equal(ctx.draft.checkIsSynced(), true)
        assert.equal(ctx.draft.hasUnsavedChanges.value, false)
        const requestCount = requests.length
        ctx.draft.startAutoSave()
        mock.timers.tick(10000)
        assert.equal(requests.length, requestCount)
        const unchanged = ctx.draft.saveImmediately()
        assert.equal(requests.length, requestCount)
        await unchanged

        ctx.data.typeSpecificData.tags.push('second')
        assert.equal(ctx.draft.checkIsSynced(), false)
        ctx.data.typeSpecificData.tags.pop()
        assert.equal(ctx.draft.checkIsSynced(), true)
        ctx.data.content = serverData.content.replace(
          '/test.png',
          '/changed.png',
        )
        assert.equal(ctx.draft.checkIsSynced(), false)
        const saving = ctx.draft.saveImmediately()
        const request = requests.at(-1)
        const payload = request.args[request.method === 'create' ? 0 : 1]
        assert.equal(payload.text, '')
        assert.equal(payload.content, ctx.data.content)
        request.resolve(response(2))
        await saving
        ctx.data.text = '![](/changed.png)'
        assert.equal(ctx.draft.checkIsSynced(), true)
      } finally {
        ctx.unmount()
        mock.timers.reset()
      }
    },
  )
}
await check('markdown text changes remain dirty and are saved', async () => {
  const ctx = mount({
    title: 'Markdown draft',
    text: 'first',
    contentFormat: 'markdown',
  })
  try {
    ctx.draft.syncMemory()
    ctx.data.text = 'second'
    assert.equal(ctx.draft.checkIsSynced(), false)
    const saving = ctx.draft.saveImmediately()
    assert.equal(requests[0].args[0].text, 'second')
    requests[0].resolve(response(1))
    await saving
    assert.equal(ctx.draft.checkIsSynced(), true)
  } finally {
    ctx.unmount()
  }
})
await check('a slow response does not mark newer edits as saved', async () => {
  const ctx = mount({ title: 'A', text: 'first' })
  const saving = ctx.draft.saveImmediately()
  ctx.data.text = 'second'
  requests[0].resolve(response(1))
  await saving
  try {
    assert.equal(ctx.draft.hasUnsavedChanges.value, true)
    assert.equal(ctx.draft.checkIsSynced(), false)
  } finally {
    ctx.unmount()
  }
})
await check(
  'overlapping saves create one draft and then save the latest version',
  async () => {
    const ctx = mount({ title: 'A', text: 'first' })
    const first = ctx.draft.saveImmediately()
    ctx.data.text = 'second'
    const second = ctx.draft.saveImmediately()
    const countBeforeResolution = requests.length
    for (const request of requests) request.resolve(response(1))
    await first
    await new Promise((resolve) => setImmediate(resolve))
    if (requests.length > countBeforeResolution)
      requests.at(-1).resolve(response(2))
    await second
    try {
      assert.equal(countBeforeResolution, 1)
      assert.equal(requests[1].method, 'update')
      assert.equal(requests[1].args[1].text, 'second')
      assert.equal(ctx.draft.checkIsSynced(), true)
    } finally {
      ctx.unmount()
    }
  },
)
await check(
  'saved nested metadata is a snapshot, not a shared mutable object',
  async () => {
    const ctx = mount({
      title: 'A',
      text: 'first',
      typeSpecificData: { tags: ['first'] },
    })
    const saving = ctx.draft.saveImmediately()
    requests[0].resolve(response(1))
    await saving
    ctx.data.typeSpecificData.tags.push('second')
    try {
      assert.equal(ctx.draft.checkIsSynced(), false)
    } finally {
      ctx.unmount()
    }
  },
)
await check('unmount cancels throttled trailing saves', async () => {
  const ctx = mount({ title: 'A', text: 'first' })
  ctx.draft.saveDraft()
  requests[0].resolve(response(1))
  await new Promise((resolve) => setImmediate(resolve))
  ctx.data.text = 'second'
  ctx.draft.saveDraft()
  ctx.unmount()
  const countAtUnmount = requests.length
  for (const request of requests) request.resolve(response(1))
  await new Promise((resolve) => setTimeout(resolve, 1100))
  const countAfterUnmount = requests.length
  for (const request of requests) request.resolve(response(1))
  assert.equal(countAfterUnmount, countAtUnmount)
})
await check(
  'content semantics preserve structural and malformed data',
  async () => {
    const { hasRichContent } = await import('../src/utils/rich-content.ts')
    const root = (children) => ({ root: { type: 'root', children } })
    for (const content of [
      undefined,
      '',
      root([]),
      root([{ type: 'paragraph', children: [] }]),
      root([
        {
          type: 'paragraph',
          children: [{ type: 'text', text: '  \n' }, { type: 'linebreak' }],
        },
      ]),
    ]) {
      assert.equal(hasRichContent(content), false)
    }
    for (const type of [
      'image',
      'code',
      'code-block',
      'mermaid',
      'table',
      'excalidraw',
      'nested-doc',
      'unknown-node',
    ]) {
      assert.equal(hasRichContent(root([{ type, children: [] }])), true, type)
    }
    for (const content of [
      '{bad',
      'null',
      '""',
      '{}',
      root([{ type: 'text', text: 'body' }]),
    ]) {
      assert.equal(hasRichContent(content), true)
    }
  },
)
await check(
  'a failed save keeps unsaved changes and can be retried',
  async () => {
    const ctx = mount({ title: 'A', text: 'first' })
    const saving = ctx.draft.saveImmediately()
    requests[0].reject(new Error('test save failure'))
    await saving
    assert.equal(ctx.draft.isSaving.value, false)
    assert.equal(ctx.draft.hasUnsavedChanges.value, true)
    assert.equal(ctx.draft.lastSavedTime.value, null)
    const retry = ctx.draft.saveImmediately()
    requests[1].resolve(response(1))
    await retry
    try {
      assert.equal(ctx.draft.checkIsSynced(), true)
    } finally {
      ctx.unmount()
    }
  },
)
await check(
  'clearing previously saved content updates the existing draft',
  async () => {
    const ctx = mount({ title: 'A', text: 'first' })
    const saving = ctx.draft.saveImmediately()
    requests[0].resolve(response(1))
    await saving
    ctx.data.title = ''
    ctx.data.text = ''
    const cleared = ctx.draft.saveImmediately()
    assert.equal(requests[1].method, 'update')
    assert.equal(requests[1].args[1].text, '')
    requests[1].resolve(response(2))
    await cleared
    try {
      assert.equal(ctx.draft.checkIsSynced(), true)
    } finally {
      ctx.unmount()
    }
  },
)
await check('editor caches and JSON key order do not save untouched content', async () => {
  const state = { root: { type: 'root', children: [{ type: 'quote', $: { blockId: 'quote-id' }, children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Bold', format: 1, style: '' }] }] }] } }
  const ctx = mount({ title: 'Existing quote', contentFormat: 'lexical', content: JSON.stringify(state) })
  try {
    ctx.draft.syncMemory()
    const rendered = structuredClone(state)
    rendered.root.children[0].textFormat = 1
    ctx.data.content = JSON.stringify(rendered)
    assert.equal(ctx.draft.checkIsSynced(), true, 'derived quote format is not an edit')
    await ctx.draft.saveImmediately()
    assert.equal(requests.length, 0)
    const reverseKeys = (value) => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverseKeys(child)])) : value
    ctx.data.content = JSON.stringify(reverseKeys(rendered))
    assert.equal(ctx.draft.checkIsSynced(), true, 'key ordering is not content')
    for (const edit of [
      (value) => { value.root.children[0].children[0].children[0].text += ' edited' },
      (value) => { value.root.children[0].children[0].children[0].format = 0 },
      (value) => { value.root.children[0].$.blockId = 'new-id' },
      (value) => { value.root.children[0].$.textStyle = 'metadata' },
    ]) {
      const value = structuredClone(rendered)
      edit(value)
      ctx.data.content = JSON.stringify(value)
      assert.equal(ctx.draft.checkIsSynced(), false, 'actual content, formatting and identity changes remain dirty')
    }
    ctx.data.content = JSON.stringify(rendered)
    assert.equal(ctx.draft.checkIsSynced(), true, 'undo to the rendered baseline is clean')
    const empty = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }
    ctx.data.content = JSON.stringify(empty)
    ctx.draft.syncMemory()
    empty.root.children[0].textFormat = 1
    ctx.data.content = JSON.stringify(empty)
    assert.equal(ctx.draft.checkIsSynced(), false, 'formatting an empty block is a real edit')
    for (const children of [[], [{ type: 'linebreak', version: 1 }], [{ type: 'inline-image', version: 1 }]]) {
      const value = { root: { type: 'root', children: [{ type: 'paragraph', children, textFormat: 1, textStyle: 'color: red;' }] } }
      ctx.data.content = JSON.stringify(value)
      ctx.draft.syncMemory()
      value.root.children[0].textFormat = 2
      ctx.data.content = JSON.stringify(value)
      assert.equal(ctx.draft.checkIsSynced(), false, 'blocks without text retain typing format')
      value.root.children[0].textFormat = 1
      value.root.children[0].textStyle = 'color: blue;'
      ctx.data.content = JSON.stringify(value)
      assert.equal(ctx.draft.checkIsSynced(), false, 'blocks without text retain typing style')
    }
    const ordered = { root: { type: 'root', children: ['first-id', 'second-id'].map((blockId) => ({ type: 'paragraph', $: { blockId }, children: [{ type: 'text', text: 'Same' }] })) } }
    ctx.data.content = JSON.stringify(ordered)
    ctx.draft.syncMemory()
    ordered.root.children.reverse()
    ctx.data.content = JSON.stringify(ordered)
    assert.equal(ctx.draft.checkIsSynced(), false, 'moving identical blocks retains identity and order')
  } finally {
    ctx.unmount()
  }
})
await check('missing and null link titles are equivalent, real titles still save', async () => {
  const link = { type: 'link', url: 'https://example.invalid/', children: [{ type: 'text', text: 'Link' }] }
  const value = { root: { type: 'root', children: [{ type: 'banner', content: { root: { type: 'root', children: [{ type: 'paragraph', children: [link] }] } } }] } }
  const ctx = mount({ title: 'Link defaults', contentFormat: 'lexical', content: JSON.stringify(value) })
  try {
    ctx.draft.syncMemory()
    link.title = null
    ctx.data.content = JSON.stringify(value)
    assert.equal(ctx.draft.checkIsSynced(), true, 'default null title does not change content')
    link.title = 'New tooltip'
    ctx.data.content = JSON.stringify(value)
    assert.equal(ctx.draft.checkIsSynced(), false, 'real title changes remain edits')
  } finally { ctx.unmount() }
})
assert.deepEqual(failures, [], 'draft safety checks failed')
