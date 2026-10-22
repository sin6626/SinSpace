import assert from 'node:assert/strict'
import { $getRoot, createEditor } from 'lexical'
import { allEditNodes, setResolvedEditNodes } from '@haklex/rich-editor/nodes'
import { document, fixtures, paragraph, text } from '../../../test/editor/fixtures.mjs'

setResolvedEditNodes(allEditNodes)
for (const [name, content, expected] of [['image', fixtures.imageOnly, 4], ['whitespace', document(paragraph(text(' '))), 4], ['empty', fixtures.empty, 2]]) {
  const editor = createEditor({ nodes: allEditNodes, onError(error) { throw error } })
  editor.setEditorState(editor.parseEditorState(document({
    type: 'grid-container', version: 1, cols: 2,
    cells: [document(paragraph(text('First'))), fixtures.empty, content, fixtures.empty],
  })))
  const original = editor.getEditorState().toJSON()
  editor.update(() => $getRoot().getFirstChild().removeCells(2), { discrete: true })
  const actual = editor.getEditorState().toJSON()
  assert.equal(actual.root.children[0].cells.length, expected, name + ': only remove a wholly empty row')
  if (expected === 4) assert.deepEqual(actual, original, name + ': no partial removal')
  console.log(`PASS grid row removal preserves ${name}`)
}
