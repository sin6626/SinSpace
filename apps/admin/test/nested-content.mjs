import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { $getRoot, $setCompositionKey, COMPOSITION_START_TAG, COMPOSITION_END_TAG, createEditor, HISTORY_PUSH_TAG, REDO_COMMAND, UNDO_COMMAND } from 'lexical'
import { allEditNodes, setResolvedEditNodes } from '@haklex/rich-editor/nodes'
import { restoreBlockIds } from '@haklex/rich-editor/plugins'
import { document, fixtures, paragraph, text } from '../../../test/editor/fixtures.mjs'

const { registerNestedContent, registerHistoryBoundary, registerHistorySnapshots } = await import(new URL('./nested-content.mjs', import.meta.resolve('@haklex/rich-editor')))
const requireLexical = createRequire(import.meta.resolve('@lexical/react/LexicalHistoryPlugin'))
const { createEmptyHistoryState, registerHistory } = await import(join(dirname(requireLexical.resolve('@lexical/history')), 'LexicalHistory.dev.mjs'))
setResolvedEditNodes(allEditNodes)
for (const value of [{ type: 'banner', bannerType: 'note' }, { type: 'alert-quote', alertType: 'note' }]) {
  const editor = createEditor({ nodes: allEditNodes, onError(error) { throw error } })
  editor.setEditorState(editor.parseEditorState(document({ ...value, version: 1 })))
  assert.equal(editor.getEditorState().toJSON().root.children[0].content.root.children[0]?.type, 'paragraph', value.type + ': new containers start with an editable paragraph')
}

for (const [name, fixture] of [['banner', fixtures.banner], ['alert', fixtures.alerts], ['grid', fixtures.grid]]) {
  const parent = createEditor({ nodes: allEditNodes, onError(error) { throw error } })
  parent.setEditorState(parent.parseEditorState(document(fixture.root.children[0], paragraph(text('After')))))
  restoreBlockIds(parent, parent.getEditorState().toJSON())
  const node = parent.getEditorState().read(() => $getRoot().getFirstChild())
  const child = parent.getEditorState().read(() => name === 'grid' ? node.getCellEditors()[0] : node.getContentEditor())
  const history = createEmptyHistoryState()
  const cleanups = [registerHistoryBoundary(parent, history), registerHistory(parent, history, 300), registerHistorySnapshots(parent, history), registerHistoryBoundary(child, history), registerHistory(child, history, 300), registerHistorySnapshots(child, history), registerNestedContent(child, parent, node.getKey(), name === 'grid' ? 0 : undefined, history)]
  const saved = parent.getEditorState()
  const original = saved.toJSON()
  child.update(() => $getRoot().getFirstDescendant().selectEnd(), { discrete: true })
  child.update(() => $getRoot().getFirstDescendant().setTextContent('Changed inside child'), { discrete: true, tag: HISTORY_PUSH_TAG })
  await delay(0)
  assert.ok(JSON.stringify(parent.getEditorState().toJSON()).includes('Changed inside child'), name + ': child changes reach parent')
  assert.deepEqual(saved.toJSON(), original, name + ': old parent snapshots are immutable')
  const edited = parent.getEditorState().toJSON()
  parent.dispatchCommand(UNDO_COMMAND, undefined)
  await delay(0)
  assert.ok(!JSON.stringify(parent.getEditorState().toJSON()).includes('Changed inside child'), name + ': shared undo')
  parent.dispatchCommand(REDO_COMMAND, undefined)
  await delay(0)
  assert.deepEqual(parent.getEditorState().toJSON(), edited, name + ': shared redo')
  parent.update(() => $getRoot().getFirstChild().remove(), { discrete: true, tag: HISTORY_PUSH_TAG })
  parent.dispatchCommand(UNDO_COMMAND, undefined)
  await delay(0)
  assert.deepEqual(parent.getEditorState().toJSON(), edited, name + ': deleting and restoring the container retains content and IDs')
  parent.dispatchCommand(UNDO_COMMAND, undefined)
  await delay(0)
  assert.ok(!JSON.stringify(parent.getEditorState().toJSON()).includes('Changed inside child'), name + ': second undo crosses the editor boundary')
  parent.dispatchCommand(REDO_COMMAND, undefined)
  await delay(0)
  assert.deepEqual(parent.getEditorState().toJSON(), edited, name + ': first redo restores child edit')
  parent.dispatchCommand(REDO_COMMAND, undefined)
  await delay(0)
  assert.equal(parent.getEditorState().toJSON().root.children.length, 1, name + ': second redo removes container')
  cleanups.forEach((cleanup) => cleanup())
  console.log(`PASS ${name}: nested save, immutable snapshots, shared undo/redo and container restore`)
}

for (const deep of [false, true]) {
  const parent = createEditor({ nodes: allEditNodes, onError(error) { throw error } })
  const grid = { type: 'grid-container', version: 1, cols: 2, cells: [document(paragraph(text('Left'))), document(paragraph(text('Right')))] }
  parent.setEditorState(parent.parseEditorState(document(deep ? { type: 'banner', version: 1, bannerType: 'note', content: document(grid) } : grid)))
  const outer = parent.getEditorState().read(() => $getRoot().getFirstChild())
  const host = deep ? outer.getContentEditor() : parent
  const node = host.getEditorState().read(() => $getRoot().getFirstChild())
  const children = host.getEditorState().read(() => node.getCellEditors())
  const history = createEmptyHistoryState()
  const cleanups = [registerHistoryBoundary(parent, history), registerHistory(parent, history, 300), registerHistorySnapshots(parent, history)]
  if (deep) cleanups.push(registerHistoryBoundary(host, history), registerHistory(host, history, 300), registerHistorySnapshots(host, history), registerNestedContent(host, parent, outer.getKey(), undefined, history))
  children.forEach((child, index) => cleanups.push(registerHistoryBoundary(child, history), registerHistory(child, history, 300), registerHistorySnapshots(child, history), registerNestedContent(child, host, node.getKey(), index, history)))
  for (const [index, child] of children.entries()) {
    child.update(() => $getRoot().getFirstDescendant().selectEnd(), { discrete: true })
    child.update(() => $getRoot().getFirstDescendant().setTextContent(index === 0 ? 'Left changed' : 'Right changed'), { discrete: true, tag: HISTORY_PUSH_TAG })
    await delay(0)
  }
  const values = () => {
    const root = parent.getEditorState().toJSON().root.children[0]
    return (deep ? root.content.root.children[0] : root).cells.map((cell) => cell.root.children[0].children[0].text)
  }
  for (const [command, expected] of [[UNDO_COMMAND, ['Left changed', 'Right']], [UNDO_COMMAND, ['Left', 'Right']], [REDO_COMMAND, ['Left changed', 'Right']], [REDO_COMMAND, ['Left changed', 'Right changed']]]) {
    parent.dispatchCommand(command, undefined)
    await delay(0)
    assert.deepEqual(values(), expected, `History crosses two independent grid editors; deep=${deep}`)
  }
  cleanups.forEach((cleanup) => cleanup())
  console.log(`PASS sibling history; deep=${deep}`)
}

{
  const parent = createEditor({ nodes: allEditNodes, onError(error) { throw error } })
  parent.setEditorState(parent.parseEditorState(document({ type: 'banner', version: 1, bannerType: 'note', content: document(paragraph(text('Before'))) })))
  const node = parent.getEditorState().read(() => $getRoot().getFirstChild())
  const child = node.getContentEditor()
  const history = createEmptyHistoryState()
  const cleanups = [registerHistoryBoundary(parent, history), registerHistory(parent, history, 300), registerHistorySnapshots(parent, history), registerHistoryBoundary(child, history), registerHistory(child, history, 300), registerHistorySnapshots(child, history), registerNestedContent(child, parent, node.getKey(), undefined, history)]
  child.update(() => $getRoot().getFirstDescendant().selectEnd(), { discrete: true })
  child.update(() => {
    const node = $getRoot().getFirstDescendant()
    $setCompositionKey(node.getKey())
    node.setTextContent('Before n')
  }, { discrete: true, tag: COMPOSITION_START_TAG })
  child.update(() => $getRoot().getFirstDescendant().setTextContent('Before ni'), { discrete: true })
  child.update(() => {
    $setCompositionKey(null)
    $getRoot().getFirstDescendant().setTextContent('Before 你')
  }, { discrete: true, tag: COMPOSITION_END_TAG })
  await delay(0)
  for (const [command, expected] of [[UNDO_COMMAND, 'Before'], [REDO_COMMAND, 'Before 你']]) {
    parent.dispatchCommand(command, undefined)
    await delay(0)
    assert.equal(child.getEditorState().read(() => $getRoot().getTextContent()), expected, 'Composition history restores the child')
    assert.equal(parent.getEditorState().toJSON().root.children[0].content.root.children[0].children[0].text, expected, 'Composition history restores the saved parent JSON too')
  }
  cleanups.forEach((cleanup) => cleanup())
  console.log('PASS nested composition protocol history')
}

{
  const editor = createEditor({ nodes: allEditNodes, onError(error) { throw error } })
  editor.setEditorState(editor.parseEditorState(document(paragraph(text('Initial')))))
  const history = createEmptyHistoryState()
  const cleanups = [registerHistoryBoundary(editor, history), registerHistory(editor, history, 300), registerHistorySnapshots(editor, history)]
  editor.update(() => $getRoot().getFirstDescendant().setTextContent('First dialog save'), { discrete: true })
  editor.dispatchCommand(UNDO_COMMAND, undefined)
  await delay(0)
  assert.equal(editor.getEditorState().read(() => $getRoot().getTextContent()), 'Initial', 'The first edit without a prior caret still has an undo baseline')
  cleanups.forEach((cleanup) => cleanup())
}
