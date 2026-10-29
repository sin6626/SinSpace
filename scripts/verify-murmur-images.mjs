import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// 检查碎碎念正文里图片的读写规则（后台 apps/admin/src/views/murmurs/murmur-images.ts）：宽度写在图片标题里、地址不变，
// 编辑时文字与图片分开、保存时拼回去。用法：node scripts/verify-murmur-images.mjs（pnpm verify）
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../apps/admin/src/views/murmurs/murmur-images.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
vm.runInNewContext(code, { module, exports: module.exports })
const { splitContent, parseMurmur, composeMurmur, widthOf, imageMarkdown } = module.exports
const plain = (value) => JSON.parse(JSON.stringify(value))

const a = 'https://s3.example.com/dev/a.webp'
const b = 'https://s3.example.com/dev/b.webp'
const content = `今天学到一个词\n\n![](${a} "w=40%")\n\n![猫](${b})\n收尾`

assert.deepEqual(plain(splitContent(content)), [
  { kind: 'text', text: '今天学到一个词' },
  { kind: 'image', alt: '', src: a, width: 40 },
  { kind: 'image', alt: '猫', src: b, width: 100 },
  { kind: 'text', text: '收尾' },
])
assert.equal(widthOf('w=5%'), 10, '最小 10%')
assert.equal(widthOf('w=300%'), 100, '最大 100%')
assert.equal(widthOf('随便的标题'), 100)
assert.equal(imageMarkdown({ alt: '', src: a, width: 100 }), `![](${a})`, '100% 不写标题')
assert.equal(imageMarkdown({ alt: '', src: a, width: 55.4 }), `![](${a} "w=55%")`)

// 编辑：文字进文本框，图片单独列出；保存时图片按顺序接在文字后面，地址原样不变
const parsed = parseMurmur(content)
assert.deepEqual(plain(parsed), { text: '今天学到一个词\n\n收尾', images: [{ alt: '', src: a, width: 40 }, { alt: '猫', src: b, width: 100 }] })
assert.equal(composeMurmur(' 说一句 \n', [{ alt: '', src: a, width: 30 }, { alt: '猫', src: b, width: 100 }]), `说一句\n\n![](${a} "w=30%")\n\n![猫](${b})`)
assert.equal(composeMurmur('', [{ alt: '', src: a, width: 100 }]), `![](${a})`, '只有图片也可以')
assert.equal(composeMurmur('只有字', []), '只有字')
assert.deepEqual(plain(parseMurmur(composeMurmur(parsed.text, parsed.images))), plain(parsed), '读出再保存不变')
console.log('PASS murmur image width in title, split text and images for editing, compose back unchanged')
