import { $toMarkdown, allHeadlessNodes } from '@haklex/rich-headless'
import { createHeadlessEditor } from '@lexical/headless'
import { BadRequestException } from '@nestjs/common'
import { parseHTML } from 'linkedom'

import { LexicalService } from '~/processors/helper/helper.lexical.service'

import { compiler } from '../../../../../shiro/node_modules/markdown-to-jsx/dist/index.modern.js'
import { decodeLexicalCode } from '../../../../../shiro/src/components/modules/shared/lexical-code'
import { createElement } from '../../../../../shiro/node_modules/react/index.js'
import { renderToStaticMarkup } from '../../../../../shiro/node_modules/react-dom/server.node.js'
import {
  code,
  document,
  element,
  fixtures,
  image,
  link,
  paragraph,
  text,
} from '../../../../../../test/editor/fixtures.mjs'

const service = new LexicalService()
const project = (state: unknown) =>
  service.lexicalToMarkdown(JSON.stringify(state))
const codeBlocks: { language: string; content: string }[] = []
function render(markdown: string) {
  codeBlocks.length = 0
  const html = renderToStaticMarkup(
    createElement(
      'main',
      null,
      compiler(markdown, {
        wrapper: null,
        extendsRules: {
          codeFenced: {
            parse(capture) {
              return {
                type: 'codeBlock',
                content: capture[4],
                lang: capture[2] || undefined,
                attrs: capture[3],
              }
            },
          },
          codeBlock: {
            react(node, _output, state) {
              const decoded = decodeLexicalCode({
                lang: node.lang,
                content: node.content,
              })
              codeBlocks.push({
                language: decoded.lang ?? '',
                content: decoded.content,
              })
              return createElement(
                'pre',
                { key: state.key, 'data-language': decoded.lang },
                decoded.content,
              )
            },
          },
        },
      }),
    ),
  )
  return parseHTML(html).document
}
function original(state: unknown) {
  const editor = createHeadlessEditor({
    nodes: allHeadlessNodes,
    onError: (error) => {
      throw error
    },
  })
  editor.setEditorState(editor.parseEditorState(JSON.stringify(state)))
  return editor.read(() => $toMarkdown())
}

describe('Lexical projection through the Shiro Markdown compiler', () => {
  it.each(['basic', 'codeOnly', 'imageOnly', 'mermaidOnly'])(
    'retains ordinary %s output',
    (name) => {
      expect(project(fixtures[name])).toBe(original(fixtures[name]))
    },
  )

  it('preserves alignment, font, size, colors and emphasis without changing JSON', () => {
    const source = JSON.stringify(fixtures.styled)
    const dom = render(project(fixtures.styled))
    expect(dom.querySelector('p')?.style.textAlign).toBe('center')
    const span = dom.querySelector('span')
    expect(span?.style.color).toBe('red')
    expect(span?.style.backgroundColor).toBe('yellow')
    expect(span?.style.fontSize).toBe('24px')
    expect(span?.style.fontFamily).toBe('Georgia')
    expect(span?.querySelector('strong')?.textContent).toBe('Styled')
    expect(JSON.stringify(fixtures.styled)).toBe(source)
  })

  it('preserves text styles inside a list and link', () => {
    const state = document(
      element(
        'list',
        [
          element(
            'listitem',
            [
              element('link', [text('red', { style: 'color: red' })], {
                url: 'https://example.invalid/',
              }),
            ],
            { value: 1 },
          ),
        ],
        { listType: 'number', start: 3, tag: 'ol' },
      ),
    )
    const dom = render(project(state))
    expect(dom.querySelector('ol')?.getAttribute('start')).toBe('3')
    expect(dom.querySelector('a span')?.style.color).toBe('red')
  })

  it('does not invent a header row in a headerless table', () => {
    const dom = render(project(fixtures.table))
    expect(dom.querySelectorAll('td')).toHaveLength(4)
    expect(dom.querySelectorAll('th')).toHaveLength(0)
  })

  it('preserves merged cells, bold text and links', () => {
    const dom = render(project(fixtures.mergedTable))
    expect(dom.querySelector('th')?.getAttribute('colSpan')).toBe('2')
    expect(dom.querySelector('th strong')?.textContent).toBe('Merged')
    expect(dom.querySelector('td a')?.getAttribute('href')).toBe(link.url)
  })

  it.each(['nested', 'details'])(
    'preserves nested media, code, links and formatting in %s',
    (name) => {
      const dom = render(project(fixtures[name]))
      expect(dom.querySelector('strong')).not.toBeNull()
      expect(dom.querySelector('img')?.getAttribute('src')).toBe(image.src)
      expect(dom.querySelector('a')?.getAttribute('href')).toBe(link.url)
      expect(codeBlocks).toContainEqual({
        language: 'javascript',
        content: code.code.replaceAll('\t', '    '),
      })
    },
  )

  it('preserves grid columns and rich content in each cell', () => {
    const dom = render(project(fixtures.grid))
    expect(
      dom.querySelector('[data-lexical="grid"]')?.style.gridTemplateColumns,
    ).toBe('repeat(2, minmax(0, 1fr))')
    expect(dom.querySelector('strong')?.textContent).toBe('First cell')
    expect(dom.querySelector('img')).not.toBeNull()
    expect(dom.querySelector('pre')?.getAttribute('data-language')).toBe(
      'javascript',
    )
  })

  it('preserves an initially open details block and ordered list start', () => {
    const state = document(
      element(
        'details',
        [
          element(
            'list',
            [
              element(
                'listitem',
                [text('First', { format: 1 }), text('\t'), link],
                { value: 3 },
              ),
            ],
            { listType: 'number', start: 3, tag: 'ol' },
          ),
          code,
        ],
        { summary: 'Show <details>', open: true },
      ),
    )
    const dom = render(project(state))
    expect(dom.querySelector('details')?.hasAttribute('open')).toBe(true)
    expect(dom.querySelector('summary')?.textContent).toBe('Show <details>')
    expect(dom.querySelector('ol')?.getAttribute('start')).toBe('3')
    expect(dom.querySelector('strong')?.textContent).toBe('First')
  })

  it('dispatches the attachment to the existing Excalidraw code renderer', () => {
    render(project(fixtures.drawing))
    expect(codeBlocks).toEqual([
      { language: 'excalidraw', content: 'ref:file/editor-fixture.excalidraw' },
    ])
  })

  it.each(['ref:file/editor-fixture.excalidraw', 'https://example.invalid/drawing.excalidraw'])(
    'preserves an Excalidraw delta after its base reference: %s',
    (reference) => {
      const snapshot = `${reference}\n${JSON.stringify({ appState: { viewBackgroundColor: ['#ffffff', '#dbeafe'] } })}`
      render(project(document({ type: 'excalidraw', version: 1, snapshot })))
      expect(codeBlocks).toEqual([{ language: 'excalidraw', content: snapshot }])
    },
  )

  it.each([
    'ref:file/../bad.excalidraw\n{}',
    'ref:file/fixture.excalidraw\n[]',
    'ref:file/fixture.excalidraw\nnull',
    'ref:file/fixture.excalidraw\n{invalid',
  ])('rejects an invalid whiteboard base or delta: %s', (snapshot) => {
    expect(() => project(document({ type: 'excalidraw', version: 1, snapshot }))).toThrow(BadRequestException)
  })

  it('uses Github alerts for banners and keeps their formatted child content', () => {
    const markdown = project(fixtures.banner)
    expect(markdown).toContain('> [!TIP]')
    expect(markdown).toContain('**Banner bold**')
    expect(markdown).toContain(`[Example link](${link.url})`)
  })

  it('encodes complex image alt text without rejecting Chinese, brackets or quotes', () => {
    const altText = '中文 [图] "quote" & <image> \'single\''
    const dom = render(project(document({ ...image, altText })))
    const img = dom.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('data-lexical-image')).toBe('true')
    expect(img?.getAttribute('alt')).toBe(
      '中文 [图] &quot;quote&quot; &amp; &lt;image&gt; &#39;single&#39;',
    )
    expect(img?.getAttribute('src')).toBe(image.src)
  })

  it('encodes a quote-only image caption that Markdown cannot parse', () => {
    const dom = render(project(document({ ...image, caption: 'a "b" c' })))
    expect(dom.querySelector('img')?.getAttribute('data-lexical-image')).toBe(
      'true',
    )
    expect(dom.querySelector('img')?.getAttribute('title')).toBe(
      'a &quot;b&quot; c',
    )
  })

  it('renders literal Markdown and HTML as text, including in styled text', () => {
    const value =
      '<script>alert(1)</script> [link](javascript:alert(1)) **literal**'
    for (const style of ['', 'color: red']) {
      const dom = render(project(document(paragraph(text(value, { style })))))
      expect(dom.querySelector('script,a,strong')).toBeNull()
      expect(dom.querySelector('main')?.textContent).toBe(value)
    }
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,unsafe',
    '//evil.invalid/a',
    'mailto:a@example.invalid',
    'https://good.invalid/" onerror="1',
    'https://user:pass@example.invalid/a',
  ])('rejects unsafe image URL %s with a 400', (src) => {
    expect(() => project(document({ ...image, src }))).toThrow(
      BadRequestException,
    )
  })

  it('allows mailto links but never image mailto URLs', () => {
    const dom = render(
      project(
        document(
          paragraph(
            element('link', [text('Email')], {
              url: 'mailto:test@example.invalid',
            }),
          ),
        ),
      ),
    )
    expect(dom.querySelector('a')?.getAttribute('href')).toBe(
      'mailto:test@example.invalid',
    )
  })

  it.each([
    'background-image: url(https://bad.invalid/a)',
    'color: red; position: fixed',
    'font-size: expression(alert(1))',
    'font-family: Georgia; width: 100%',
  ])('rejects unsupported CSS %s', (style) => {
    expect(() => project(document(paragraph(text('text', { style }))))).toThrow(
      BadRequestException,
    )
  })

  it('rejects code language attributes that would invoke a component renderer', () => {
    for (const language of ['component', 'lexical-code'])
      expect(() => project(document({ ...code, language }))).toThrow(
        BadRequestException,
      )
    expect(() =>
      project(document({ ...code, language: 'js\n<script>' })),
    ).toThrow(BadRequestException)
  })

  it('preserves mixed styled and plain siblings and nested styled lists', () => {
    const state = document(
      paragraph(
        text('bold ', { format: 1 }),
        text('red', { format: 1, style: 'color: red' }),
        text(' tail'),
      ),
      element(
        'list',
        [
          element(
            'listitem',
            [
              text('outer'),
              element(
                'list',
                [
                  element(
                    'listitem',
                    [text('inner', { style: 'color: blue' })],
                    { value: 1 },
                  ),
                ],
                { listType: 'bullet', tag: 'ul', start: 1 },
              ),
            ],
            { value: 1 },
          ),
        ],
        { listType: 'bullet', tag: 'ul', start: 1 },
      ),
    )
    const dom = render(project(state))
    expect(dom.querySelector('p')?.textContent.trim()).toBe('bold red tail')
    expect(dom.querySelectorAll('ul')).toHaveLength(2)
    expect(dom.querySelector('ul ul span')?.style.color).toBe('blue')
  })

  it('preserves table sizing, background and vertical alignment', () => {
    const state = document(
      element(
        'table',
        [
          element(
            'tablerow',
            [
              element('tablecell', [paragraph(text('cell'))], {
                colSpan: 1,
                rowSpan: 2,
                headerState: 0,
                width: 80,
                backgroundColor: '#ff0000',
                verticalAlign: 'bottom',
                format: 'right',
              }),
            ],
            { height: 30 },
          ),
        ],
        { colWidths: [80], format: 'center' },
      ),
    )
    const dom = render(project(state))
    expect(dom.querySelector('table')?.style.textAlign).toBe('center')
    expect(dom.querySelector('col')?.style.width).toBe('80px')
    expect(dom.querySelector('tr')?.style.height).toBe('30px')
    expect(dom.querySelector('td')?.style.verticalAlign).toBe('bottom')
    expect(dom.querySelector('td')?.style.textAlign).toBe('right')
    expect(dom.querySelector('td')?.style.backgroundColor).toBe('#ff0000')
  })

  it('keeps URL query ampersands separate from encoded alt/title attributes', () => {
    const src = 'https://example.invalid/a.png?a=1&b=2'
    const dom = render(
      project(
        document({
          ...image,
          src,
          altText: '&quot; [图]',
          caption: '中文 \"title\" [ok]',
        }),
      ),
    )
    expect(dom.querySelector('img')?.getAttribute('src')).toBe(src)
    expect(dom.querySelector('img')?.getAttribute('alt')).toBe(
      '&amp;quot; [图]',
    )
    expect(dom.querySelector('img')?.getAttribute('title')).toBe(
      '中文 &quot;title&quot; [ok]',
    )
  })

  it.each([
    '# literal heading',
    '- literal list',
    '---',
    '[x](https://evil.invalid/)',
    '<img src=x onerror=alert(1)>',
  ])(
    'does not turn literal text %s into Markdown or HTML structure',
    (value) => {
      const dom = render(project(document(paragraph(text(value)))))
      expect(dom.querySelector('h1,ul,hr,a,img,input')).toBeNull()
      expect(dom.querySelector('main')?.textContent).toBe(value)
    },
  )

  it('preserves block equations in the shared search and RSS projection', () => {
    const equation = String.raw`\sum_{i=1}^{n} i = \frac{n(n+1)}{2}`
    expect(project(document({ type: 'katex-block', version: 1, equation })))
      .toBe(`$$${equation}$$`)
  })

  it('keeps all registered ordinary custom node types available', () => {
    const state = document(
      paragraph(element('ruby', [text('漢字')], { reading: 'かんじ' }), {
        type: 'katex-inline',
        version: 1,
        equation: 'x^2',
      }),
      {
        type: 'link-card',
        version: 1,
        title: 'Example',
        url: 'https://example.invalid/',
      },
      {
        type: 'gallery',
        version: 1,
        images: [{ src: image.src, alt: 'ordinary' }],
      },
    )
    expect(project(state)).toBe(original(state))
  })

  it('rejects unsupported table layout instead of discarding it', () => {
    expect(() =>
      project(
        document({ ...fixtures.table.root.children[0], frozenRowCount: 1 }),
      ),
    ).toThrow(BadRequestException)
  })

  it('rejects invalid nested nodes without returning a partial projection', () => {
    expect(() =>
      project(
        document(paragraph(text('valid')), {
          type: 'nested-doc',
          version: 1,
          content: fixtures.invalid,
        }),
      ),
    ).toThrow(BadRequestException)
  })
  const containers = {
    nested: (block: unknown) => ({
      type: 'nested-doc',
      version: 1,
      content: document(block),
    }),
    details: (block: unknown) =>
      element('details', [block], { summary: 'Show', open: true }),
    table: (block: unknown) =>
      element('table', [
        element('tablerow', [
          element('tablecell', [block], {
            headerState: 0,
            colSpan: 1,
            rowSpan: 1,
          }),
        ]),
      ]),
    grid: (block: unknown) => ({
      type: 'grid-container',
      version: 1,
      cols: 1,
      gap: '1px',
      cells: [document(block)],
    }),
  }
  const closingTags =
    '</section>\n</details>\n</td>\n</div>\n<img src="https://evil.invalid/">'
  for (const [name, wrap] of Object.entries(containers)) {
    it.each(['code-block', 'code', 'code-snippet', 'mermaid', 'excalidraw'])(
      `keeps closing tags literal in ${name} %s`,
      (type) => {
        const value =
          type === 'excalidraw'
            ? JSON.stringify({ text: closingTags })
            : closingTags
        const block =
          type === 'code-block'
            ? { ...code, code: value }
            : type === 'code-snippet'
              ? {
                  type,
                  version: 1,
                  files: [
                    {
                      filename: 'fixture.js',
                      language: 'javascript',
                      code: value,
                    },
                  ],
                }
              : type === 'code'
                ? element('code', [text(value)], { language: 'javascript' })
                : type === 'mermaid'
                  ? { type, version: 1, diagram: value }
                  : { type, version: 1, snapshot: value }
        const dom = render(project(document(wrap(block))))
        expect(codeBlocks).toEqual([
          {
            language: type.startsWith('code') ? 'javascript' : type,
            content: value,
          },
        ])
        expect(dom.querySelector('img')).toBeNull()
      },
    )
  }

  it('keeps ordinary multi-file snippet output unchanged', () => {
    const state = document({
      type: 'code-snippet',
      version: 1,
      files: [
        { filename: 'a.ts', language: 'typescript', code: 'const value = 1' },
      ],
    })
    expect(project(state)).toBe(original(state))
  })

  it('keeps snippet filenames literal and preserves every file', () => {
    const filename = '</section><img src="https://evil.invalid/">'
    const state = document(
      containers.nested({
        type: 'code-snippet',
        version: 1,
        files: [
          { filename, language: 'javascript', code: closingTags },
          {
            filename: 'plain.ts',
            language: 'typescript',
            code: 'const value = 1',
          },
        ],
      }),
    )
    const dom = render(project(state))
    expect(dom.querySelector('h4')?.textContent).toBe(filename)
    expect(dom.querySelector('img')).toBeNull()
    expect(codeBlocks.map((block) => block.content)).toEqual([
      closingTags,
      'const value = 1',
    ])
  })

  it.each(['', 'color: red'])(
    'preserves backticks in inline code with style %s',
    (style) => {
      const value = '* x [a] <b> & ` tick'
      const dom = render(
        project(document(paragraph(text(value, { format: 16, style })))),
      )
      expect(dom.querySelector('code')?.textContent).toBe(value)
      expect(dom.querySelector('b')).toBeNull()
    },
  )
})
