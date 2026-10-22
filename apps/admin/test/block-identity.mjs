import assert from 'node:assert/strict'
import { $getRoot, $getState, $setState, createEditor } from 'lexical'

import { allEditNodes, setResolvedEditNodes } from '@haklex/rich-editor/nodes'
import { blockIdState } from '@haklex/rich-editor/plugins'
import {
  $isNestedDocEditNode,
  nestedDocEditNodes,
} from '@haklex/rich-ext-nested-doc'

import { restoreBlockIds } from '@haklex/rich-editor/plugins'

const root = (children) => ({
  root: {
    type: 'root',
    version: 1,
    children,
    format: '',
    indent: 0,
    direction: null,
  },
})
const document = root([
  {
    type: 'paragraph',
    version: 1,
    children: [],
    $: { blockId: 'paragraph-id' },
  },
  {
    type: 'code-block',
    version: 1,
    code: 'const x = 1',
    language: 'js',
    $: { blockId: 'code-id' },
  },
  {
    type: 'mermaid',
    version: 1,
    diagram: 'graph TD;A-->B',
    $: { blockId: 'mermaid-id' },
  },
  {
    type: 'nested-doc',
    version: 1,
    content: root([
      {
        type: 'code-block',
        version: 1,
        code: 'nested()',
        language: 'js',
        $: { blockId: 'nested-code-id' },
      },
    ]),
    $: { blockId: 'nested-doc-id' },
  },
])
const parse = (value) => {
  const editor = createEditor({
    headless: true,
    nodes: [...allEditNodes, ...nestedDocEditNodes],
    onError(error) {
      throw error
    },
  })
  editor.setEditorState(editor.parseEditorState(JSON.stringify(value)))
  return editor
}
const ids = (editor) =>
  editor.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((node) => $getState(node, blockIdState)),
  )
const editor = parse(document)
assert.deepEqual(ids(editor).slice(0, 3), ['paragraph-id', '', ''])
restoreBlockIds(editor, document)
assert.deepEqual(ids(editor), [
  'paragraph-id',
  'code-id',
  'mermaid-id',
  'nested-doc-id',
])
const saved = editor.getEditorState().toJSON()
const reloaded = parse(saved)
restoreBlockIds(reloaded, saved)
assert.deepEqual(
  reloaded.getEditorState().toJSON(),
  saved,
  'reload must preserve saved JSON and IDs',
)
const nested = saved.root.children[3].content
const nestedEditor = parse(nested)
restoreBlockIds(nestedEditor, nested)
assert.deepEqual(
  ids(nestedEditor),
  ['nested-code-id'],
  'nested editors preserve their own block IDs',
)
editor.update(
  () => $setState($getRoot().getFirstChild(), blockIdState, 'existing-id'),
  { discrete: true },
)
restoreBlockIds(editor, document)
assert.equal(
  ids(editor)[0],
  'existing-id',
  'existing editor IDs must not be overwritten',
)
const withoutIds = root([
  { type: 'code-block', version: 1, code: 'new()', language: 'js' },
])
const nestedCode = {
  type: 'code-block',
  version: 1,
  code: 'nested()',
  language: 'js',
  $: { blockId: 'inner-id' },
}
for (const container of [
  {
    type: 'alert-quote',
    version: 1,
    alertType: 'tip',
    content: root([
      { type: 'horizontalrule', version: 1, $: { blockId: 'inner-id' } },
    ]),
  },
  {
    type: 'banner',
    version: 1,
    bannerType: 'tip',
    content: root([
      { type: 'horizontalrule', version: 1, $: { blockId: 'inner-id' } },
    ]),
  },
  {
    type: 'grid-container',
    version: 1,
    cols: 1,
    cells: [
      root([
        { type: 'horizontalrule', version: 1, $: { blockId: 'inner-id' } },
      ]),
    ],
  },
]) {
  const value = root([container])
  const containerEditor = parse(value)
  restoreBlockIds(containerEditor, value)
  const serialized = containerEditor.getEditorState().toJSON().root.children[0]
  const content = serialized.content ?? serialized.cells[0]
  assert.equal(
    content.root.children[0].$.blockId,
    'inner-id',
    `${container.type} preserves inner block IDs`,
  )
}
const duplicate = root([{ ...nestedCode }, { ...nestedCode }])
const duplicateEditor = parse(duplicate)
restoreBlockIds(duplicateEditor, duplicate)
assert.deepEqual(
  ids(duplicateEditor),
  ['inner-id', 'inner-id'],
  'duplicate correction remains owned by BlockIdPlugin',
)
const newEditor = parse(withoutIds)
restoreBlockIds(newEditor, withoutIds)
assert.deepEqual(ids(newEditor), [''], 'the existing plugin owns ID generation')
console.log(
  'PASS persisted block IDs survive reload and nested editor initialization',
)

const saveNestedDialog = (parent, value) => {
  const node = parent.getEditorState().read(() => $getRoot().getLastChild())
  assert.ok($isNestedDocEditNode(node))
  parent.update(() => node.setContentState(value), { discrete: true })
  return parent.getEditorState().toJSON().root.children.at(-1).content
}
const parent = parse(document)
restoreBlockIds(parent, document)
const dialogContent = root([
  ...document.root.children[3].content.root.children,
  {
    type: 'image',
    version: 1,
    src: '/local-fixture.png',
    altText: 'local',
    $: { blockId: 'image-id' },
  },
])
const dialogValue = parse(dialogContent)
restoreBlockIds(dialogValue, dialogContent)
const dialogSaved = dialogValue.getEditorState().toJSON()
const priorParent = parent.getEditorState()
const priorJSON = priorParent.toJSON()
assert.deepEqual(
  saveNestedDialog(parent, dialogSaved),
  dialogSaved,
  'saving the dialog must preserve its block IDs in the parent JSON',
)
assert.deepEqual(priorParent.toJSON(), priorJSON, 'Saving a nested dialog does not mutate historical parent snapshots')

assert.deepEqual(
  saveNestedDialog(parent, dialogSaved),
  dialogSaved,
  'saving the same dialog again does not change content or IDs',
)
const replacementValue = root([
  { ...nestedCode, $: { blockId: 'new-node-id' } },
])
const replacement = parse(replacementValue)
restoreBlockIds(replacement, replacementValue)
const replacementSaved = replacement.getEditorState().toJSON()
assert.deepEqual(
  saveNestedDialog(parent, replacementSaved),
  replacementSaved,
  'a new node at the same position keeps its own ID',
)
const withoutIdSaved = parse(withoutIds).getEditorState().toJSON()
assert.deepEqual(
  saveNestedDialog(parent, withoutIdSaved),
  withoutIdSaved,
  'a new node without an ID must not inherit one from old dialog content',
)
console.log(
  'PASS nested dialog saves preserve current block IDs without restoring stale IDs',
)

setResolvedEditNodes([...allEditNodes, ...nestedDocEditNodes])
const richNestedContent = root([
  { type: 'image', version: 1, src: '/local-fixture.png', altText: 'nested', $: { blockId: 'nested-image' } },
  { type: 'code-block', version: 1, code: 'nested()', language: 'js', $: { blockId: 'nested-code' } },
])
for (const node of [
  { type: 'banner', version: 1, bannerType: 'note', content: richNestedContent },
  { type: 'alert-quote', version: 1, alertType: 'note', content: richNestedContent },
  { type: 'grid-container', version: 1, cols: 2, cells: [richNestedContent, richNestedContent] },
]) {
  const initial = root([{ ...node, $: { blockId: 'container-root' } }])
  const editor = parse(initial)
  restoreBlockIds(editor, initial)
  const saved = editor.getEditorState().toJSON().root.children[0]
  for (const content of saved.cells || [saved.content]) {
    assert.deepEqual(content.root.children.map((child) => child.type), ['image', 'code-block'])
    assert.deepEqual(content.root.children.map((child) => child.$?.blockId), ['nested-image', 'nested-code'])
  }
  console.log(`PASS ${node.type} loads registered rich nodes and preserves their identities`)
}

const detailsValue = root([{ type: 'details', version: 1, summary: 'Keep nested identity', open: true, children: [nestedCode], direction: null, format: '', indent: 0 }])
const detailsEditor = parse(detailsValue)
restoreBlockIds(detailsEditor, detailsValue)
assert.equal(detailsEditor.getEditorState().toJSON().root.children[0].children[0].$?.blockId, 'inner-id', 'decorators inside element containers retain IDs')
