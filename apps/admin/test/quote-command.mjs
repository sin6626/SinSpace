import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { $getRoot, $getState, $setState, createEditor } from 'lexical'
import { builtinNodes } from '@haklex/rich-editor/nodes'
import { blockIdState } from '@haklex/rich-editor/plugins'
import { document, paragraph, text } from '../../../test/editor/fixtures.mjs'

registerHooks({
  load(url, context, next) {
    return url.endsWith('.css')
      ? { format: 'module', source: 'export default {}', shortCircuit: true }
      : next(url, context)
  },
})
const kit = realpathSync(new URL('../node_modules/@haklex/rich-kit-shiro', import.meta.url))
const { getBuiltinItems } = await import(pathToFileURL(join(dirname(kit), 'rich-plugin-slash-menu/dist/index.mjs')))
const quote = getBuiltinItems().find((item) => item.title === 'Quote')
assert.ok(quote)

for (const children of [[], [text('Quote probe', { format: 1 })]]) {
  const editor = createEditor({ nodes: builtinNodes, onError(error) { throw error } })
  editor.setEditorState(editor.parseEditorState(document(paragraph(...children))))
  editor.update(() => {
    $getRoot().getFirstChildOrThrow().selectEnd()
    quote.onSelect(editor)
  }, { discrete: true })
  editor.update(() => $setState($getRoot().getFirstChildOrThrow(), blockIdState, 'quote-identity'), { discrete: true })
  const first = editor.getEditorState().toJSON()
  for (let count = 2; count <= 10; count++) {
    editor.update(() => quote.onSelect(editor), { discrete: true })
    const current = editor.getEditorState().toJSON()
    const nested = (node) => (node.type === 'paragraph' ? (node.children || []).filter((child) => child.type === 'paragraph').length : 0)
      + (node.children || []).reduce((sum, child) => sum + nested(child), 0)
    assert.equal(nested(current.root), 0, `Quote ${count}: nested paragraphs`)
    assert.deepEqual(current, first, `Quote ${count}: content and block identity stay unchanged`)
    editor.getEditorState().read(() => assert.equal($getState($getRoot().getFirstChildOrThrow(), blockIdState), 'quote-identity'))
  }
}
console.log('Empty and formatted Quote commands remain unchanged across ten selections.')
