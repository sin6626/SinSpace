export const text = (value, extra = {}) => ({ type: 'text', version: 1, text: value, format: 0, detail: 0, mode: 'normal', style: '', ...extra })
export const element = (type, children = [], extra = {}) => ({ type, version: 1, children, direction: null, format: '', indent: 0, ...extra })
export const document = (...children) => ({ root: element('root', children) })
export const paragraph = (...children) => element('paragraph', children)
export const image = { type: 'image', version: 1, src: 'http://127.0.0.1:2433/objects/image/editor-fixture.png', altText: 'editor fixture' }
export const code = { type: 'code-block', version: 1, language: 'javascript', code: 'const answer = 42\n\tconsole.log(answer)' }
export const link = element('link', [text('Example link')], { url: 'https://example.invalid/', rel: 'noopener', target: '_blank' })
const legacyQuoteBody = element('paragraph', [text('Legacy quote', { format: 1 })], { format: 'center', $: { blockId: 'bodyOld1' } })
export const repairedQuote = document(element('quote', [legacyQuoteBody], { $: { blockId: 'quoteOld' } }))
export const legacyQuote = document(element('quote', [paragraph(paragraph(paragraph(legacyQuoteBody)))], { $: { blockId: 'quoteOld' } }))
const cell = (children, extra = {}) => element('tablecell', children, { headerState: 0, colSpan: 1, rowSpan: 1, ...extra })
const row = (...cells) => element('tablerow', cells)

export const fixtures = {
  empty: document(paragraph()),
  whitespace: document(paragraph(text(' \n\t'))),
  imageOnly: document(image),
  codeOnly: document(code),
  mermaidOnly: document({ type: 'mermaid', version: 1, diagram: 'graph TD; A-->B' }),
  basic: document(paragraph(text('Bold', { format: 1 }), text(' and '), link), image),
  alerts: document(...['note', 'tip', 'important', 'warning', 'caution'].map(alertType => ({ type: 'alert-quote', version: 1, alertType, content: document(paragraph(text(`${alertType} message`, { format: 1 }), text(' '), link)) }))),
  banner: document({ type: 'banner', version: 1, bannerType: 'tip', content: document(paragraph(text('Banner bold', { format: 1 }), text(' '), link)) }),
  styled: document(element('paragraph', [text('Styled', { format: 1, style: 'color: red; background-color: yellow; font-size: 24px; font-family: Georgia;' })], { format: 'center' })),
  table: document(element('table', [row(cell([paragraph(text('A'))]), cell([paragraph(text('B'))])), row(cell([paragraph(text('C'))]), cell([paragraph(text('D'))]))])),
  mergedTable: document(element('table', [row(cell([paragraph(text('Merged', { format: 1 }))], { colSpan: 2, headerState: 1 })), row(cell([paragraph(link)]), cell([paragraph(text('Cell'))]))])),
  nested: document({ type: 'nested-doc', version: 1, title: 'Nested document', content: document(paragraph(text('Nested bold', { format: 1 }), text(' '), link), image, code) }),
  grid: document({ type: 'grid-container', version: 1, cols: 2, gap: '16px', cells: [document(paragraph(text('First cell', { format: 1 })), image), document(code)] }),
  details: document(element('details', [paragraph(text('Details bold', { format: 1 }), text(' '), link), image, code], { summary: 'Expand details', open: false })),
  drawing: document({ type: 'excalidraw', version: 1, snapshot: 'ref:file/editor-fixture.excalidraw' }),
  invalid: document({ type: 'unsupported-editor-node', version: 1 }),
}

export const legacyMarkdown = '# Legacy Markdown\n\n**Bold** and [Example link](https://example.invalid/).\n\n> [!NOTE]\n> Existing note\n\n```javascript\nconst answer = 42\n```'
