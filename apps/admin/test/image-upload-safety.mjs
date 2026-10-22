import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { mock } from 'node:test'
import ts from 'typescript'
import { effectScope } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('~/')) {
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      )
    }
    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
      return nextResolve(`${specifier}.tsx`, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (new URL(url).pathname.endsWith('.tsx')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
          compilerOptions: {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
            jsxImportSource: 'vue',
          },
        }).outputText,
      }
    }
    return nextLoad(url, context)
  },
})
let upload
let isSynced
let hasContent
let request
const mockSource = (path, exports) =>
  mock.module(new URL(path, import.meta.url).href, { exports })
mockSource('../src/api/files.ts', {
  filesApi: {
    upload() {
      request = Promise.withResolvers()
      return request.promise
    },
  },
})
mockSource('../src/hooks/use-save-confirm.ts', {
  useSaveConfirm(_enabled, check) {
    isSynced = check
  },
})
mockSource('../src/components/editor/rich/RichEditor.tsx', {
  RichEditor: () => null,
})
mockSource('../src/components/editor/write-editor/WriteEditorBase.tsx', {
  WriteEditorBase: () => null,
})
const { RichWriteEditor } =
  await import('../src/components/editor/write-editor/RichWriteEditor.tsx')
const scope = effectScope()
const render = scope.run(() =>
  RichWriteEditor.setup({
    loading: false,
    title: '',
    variant: 'post',
    onTitleChange() {},
    saveConfirmFn: () => true,
  }),
)
hasContent = () => render().props.hasContent
upload = render().children[0].props.imageUpload
try {
  assert.equal(isSynced(), true)
  const file = new File(['image'], 'test.png', {
    type: 'image/png',
    lastModified: 1,
  })
  const first = upload(file)
  const firstRejected = assert.rejects(first, /upload failed/)
  const blockedWhilePending = !isSynced() && hasContent()
  request.reject(new Error('upload failed'))
  await firstRejected
  assert.equal(
    blockedWhilePending,
    true,
    'pending upload must block silent leave and format switching',
  )
  assert.equal(isSynced(), false, 'failed upload must retain leave protection')
  assert.equal(hasContent(), true)
  const retry = upload(
    new File(['image'], 'test.png', { type: 'image/png', lastModified: 1 }),
  )
  request.resolve({ url: '/objects/test.png' })
  assert.deepEqual(await retry, { src: '/objects/test.png' })
  assert.equal(
    isSynced(),
    false,
    'upload response alone cannot confirm insertion into the document',
  )
  render().children[0].props.onChange({
    root: {
      type: 'root',
      children: [{ type: 'image', src: '/objects/test.png' }],
    },
  })
  assert.equal(
    isSynced(),
    true,
    'a successful retry clears the failed upload after insertion',
  )
  const firstConcurrent = upload(file)
  const firstRequest = request
  const secondConcurrent = upload(file)
  const secondRequest = request
  firstRequest.resolve({ url: '/objects/one.png' })
  await firstConcurrent
  render().children[0].props.onChange({
    root: { children: [{ type: 'image', src: '/objects/one.png' }] },
  })
  const blockedWhileSecondPending = !isSynced()
  secondRequest.resolve({ url: '/objects/two.png' })
  await secondConcurrent
  assert.equal(
    blockedWhileSecondPending,
    true,
    'one insertion must not clear another pending upload of the same file',
  )
  render().children[0].props.onChange({
    root: { children: [{ type: 'image', src: '/objects/two.png' }] },
  })
  assert.equal(isSynced(), true)
  console.log(
    'PASS pending upload, failure, retry, insertion, and overlapping uploads use the leave guard',
  )
} finally {
  scope.stop()
}
