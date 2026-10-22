import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { $createRangeSelection, $getRoot, $getSelection, $setSelection, createEditor } from 'lexical'
import { allNodes } from '@haklex/rich-editor/nodes'
import { $setRichBlocksType } from '@haklex/rich-editor/commands'
import { document, element, paragraph, text } from '../../../test/editor/fixtures.mjs'

const quote = (...children) => element('quote', children)
const list = (...values) => element('list', values.map((value, index) => element('listitem', [text(value)], { value: index + 1 })), { listType: 'bullet', start: 1, tag: 'ul' })
const details = (...children) => element('details', children, { summary: 'Keep summary', open: true })
const nestedList = () => document(element('list', [element('listitem', [text('Parent'), list('Nested')], { value: 1 })], { listType: 'bullet', start: 1, tag: 'ul' }))
const cases = [
  { name: 'heading', value: document(element('heading', [text('Heading', { format: 1 })], { tag: 'h2', format: 'center' })), expect: ['quote'], text: ['Heading'] },
  { name: 'list middle', value: document(list('Before', 'Selected', 'After')), select: [1, 1], expect: ['list', 'quote', 'list'], text: ['Before', 'Selected', 'After'] },
  { name: 'numbered list middle', value: document(element('list', ['Before', 'Selected', 'After'].map((value, index) => element('listitem', [text(value)], { value: index + 5 })), { listType: 'number', start: 5, tag: 'ol' })), select: [1, 1], expect: ['list', 'quote', 'list'], text: ['Before', 'Selected', 'After'] },
  { name: 'nested list', value: nestedList(), expect: ['quote'], text: ['Parent', 'Nested'] },
  { name: 'nested list to paragraph', value: nestedList(), type: 'paragraph', expect: ['paragraph', 'list'], text: ['Parent', 'Nested'] },
  { name: 'nested list to heading', value: nestedList(), type: 'h2', expect: ['heading', 'list'], text: ['Parent', 'Nested'] },
  { name: 'details', value: document(details(paragraph(text('Inside')))), expect: ['details'], text: ['Inside'] },
  { name: 'table cell', value: document(element('table', [element('tablerow', [element('tablecell', [paragraph(text('Cell'))], { headerState: 0, colSpan: 1, rowSpan: 1 })])])), expect: ['table'], text: ['Cell'] },
  { name: 'two paragraphs', value: document(paragraph(text('One')), paragraph(text('Two'))), select: [0, 1], expect: ['quote'], text: ['One', 'Two'] },
  { name: 'backward range', value: document(paragraph(text('One')), paragraph(text('Two'))), select: [1, 0], expect: ['quote'], text: ['One', 'Two'] },
  { name: 'mixed quoted range', value: document(quote(paragraph(text('Quoted'))), paragraph(text('Outside'))), select: [0, 1], expect: ['quote', 'quote'], text: ['Quoted', 'Outside'] },
  { name: 'exit middle', value: document(quote(paragraph(text('Before')), paragraph(text('Selected')), paragraph(text('After')))), select: [1, 1], type: 'paragraph', expect: ['quote', 'paragraph', 'quote'], text: ['Before', 'Selected', 'After'] },
  { name: 'exit heading', value: document(quote(paragraph(text('Heading')))), type: 'h2', expect: ['heading'], text: ['Heading'] },
  { name: 'exit in details', value: document(details(quote(paragraph(text('Inside'))))), type: 'paragraph', expect: ['details'], text: ['Inside'] },
]
const collect = (node, predicate) => [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap((child) => collect(child, predicate))]
const results = []
for (const test of cases) {
  const editor = createEditor({ nodes: allNodes, onError(error) { throw error } })
  editor.setEditorState(editor.parseEditorState(test.value))
  let selectedText
  editor.update(() => {
    const nodes = $getRoot().getAllTextNodes()
    const [start, end] = test.select || [0, 0]
    const selection = $createRangeSelection()
    selection.anchor.set(nodes[start].getKey(), start > end ? nodes[start].getTextContentSize() : 0, 'text')
    selection.focus.set(nodes[end].getKey(), start >= end ? 0 : nodes[end].getTextContentSize(), 'text')
    $setSelection(selection)
    selectedText = selection.getTextContent()
    $setRichBlocksType(selection, test.type || 'quote')
    assert.equal($getSelection().getTextContent(), selectedText, test.name + ': selection survives')
  }, { discrete: true })
  const state = editor.getEditorState().toJSON()
  assert.deepEqual(state.root.children.map((node) => node.type), test.expect, test.name)
  assert.deepEqual(collect(state.root, (node) => node.type === 'text').map((node) => node.text), test.text, test.name + ': all content retained')
  for (const node of collect(state.root, (node) => ['paragraph', 'heading'].includes(node.type))) {
    assert.ok(node.children.every((child) => !['paragraph', 'heading', 'list', 'listitem', 'quote', 'table'].includes(child.type)), test.name + ': inline block children')
  }
  if (test.name.includes('details')) assert.equal(state.root.children[0].summary, 'Keep summary')
  if (test.name === 'details') assert.equal(state.root.children[0].children[0].type, 'quote')
  if (test.name === 'table cell') assert.equal(state.root.children[0].children[0].children[0].children[0].type, 'quote')
  if (test.name === 'exit in details') {
    assert.equal(state.root.children[0].children[0].type, 'paragraph')
    assert.equal(collect(state.root, (node) => node.type === 'quote').length, 0)
  }
  if (test.name === 'numbered list middle') assert.equal(state.root.children[2].start, 7, 'Unselected tail retains its number')
  if (test.name === 'heading') {
    assert.equal(state.root.children[0].children[0].format, 'center')
    assert.equal(state.root.children[0].children[0].children[0].format, 1)
  }
  console.log(test.name + ': structure, content and selection passed')
  results.push({ name: test.name, state })
}
const output = new URL('../../../.local/editor-behavior-audit/', import.meta.url)
mkdirSync(output, { recursive: true })
writeFileSync(new URL('quote-transform-result.json', output), JSON.stringify(results, null, 2))
