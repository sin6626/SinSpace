// 只读盘点日常库中 Lexical 内容的节点类型，供 Plate 迁移计划使用。
// 不写数据库、不输出正文，只统计节点类型、属性与出现位置。
// 用法：node scripts/inventory-lexical.mjs > docs/plate-lexical-inventory.md
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const { MongoClient } = createRequire(join(root, 'apps/core/package.json'))('mongodb')
const dataRoot = resolve(process.env.MIX_SPACE_DATA_ROOT || join(root, '../ShrioRenovation/.local'))
const database = readFileSync(join(dataRoot, 'database'), 'utf8').trim()
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27018'

const textFormats = ['加粗', '斜体', '删除线', '下划线', '行内代码', '下标', '上标', '高亮']
const types = new Map() // type -> { count, docs:Set, attrs:Map<string, Set>, maxDepth }
const formatUse = new Map()
const imageHosts = new Map()
const docs = []

function record(type, docKey, depth) {
  if (!types.has(type)) types.set(type, { count: 0, docs: new Set(), attrs: new Map(), maxDepth: 0 })
  const entry = types.get(type)
  entry.count++
  entry.docs.add(docKey)
  entry.maxDepth = Math.max(entry.maxDepth, depth)
  return entry
}

function addAttr(entry, name, value) {
  if (value === undefined || value === null || value === '') return
  if (!entry.attrs.has(name)) entry.attrs.set(name, new Set())
  entry.attrs.get(name).add(String(value))
}

function walk(node, docKey, depth, stats) {
  if (!node || typeof node !== 'object') return
  const type = node.type ?? '(无 type)'
  const entry = record(type, docKey, depth)
  stats.nodes++
  stats.depth = Math.max(stats.depth, depth)
  if (type === 'heading') addAttr(entry, '级别', node.tag)
  if (type === 'list') addAttr(entry, '列表类型', node.listType)
  if (type === 'code' || type === 'code-block' || type === 'codeblock') addAttr(entry, '语言', node.language ?? node.lang)
  if (type === 'text' && Number.isInteger(node.format)) {
    textFormats.forEach((label, bit) => { if (node.format & (1 << bit)) formatUse.set(label, (formatUse.get(label) ?? 0) + 1) })
  }
  const src = typeof node.src === 'string' ? node.src : typeof node.url === 'string' && type.includes('image') ? node.url : undefined
  if (src) {
    let host
    try { host = new URL(src).host } catch { host = src.startsWith('/') ? '(站内相对路径)' : '(无法解析)' }
    imageHosts.set(`${type} · ${host}`, (imageHosts.get(`${type} · ${host}`) ?? 0) + 1)
  }
  // 记录非通用字段名，方便识别扩展节点需要哪些属性。
  for (const key of Object.keys(node)) {
    if (!['type', 'version', 'children', 'direction', 'format', 'indent', 'text', 'detail', 'mode', 'style', 'textFormat', 'textStyle'].includes(key)) addAttr(entry, '字段', key)
  }
  if (Array.isArray(node.children)) for (const child of node.children) walk(child, docKey, depth + 1, stats)
}

const client = await MongoClient.connect(mongoUrl, { serverSelectionTimeoutMS: 3000 })
try {
  const db = client.db(database)
  for (const [collection, label] of [['posts', '文章'], ['notes', '手记'], ['pages', '页面']]) {
    const cursor = db.collection(collection).find({ contentFormat: 'lexical' }, { projection: { title: 1, nid: 1, slug: 1, content: 1 } })
    for await (const doc of cursor) {
      const docKey = `${label}:${doc.nid ?? doc.slug ?? doc._id}`
      const stats = { nodes: 0, depth: 0, error: null }
      try {
        const parsed = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content
        walk(parsed?.root, docKey, 0, stats)
      } catch (error) {
        stats.error = error.message
      }
      docs.push({ docKey, title: doc.title, ...stats })
    }
  }
} finally {
  await client.close()
}

const lines = []
lines.push('# Lexical 内容盘点（Plate 迁移第一步）', '')
lines.push(`生成日期：${new Date().toISOString().slice(0, 10)}。数据库：\`${database}\`。由 \`scripts/inventory-lexical.mjs\` 只读生成，未修改任何内容，不含正文。`, '')
lines.push(`共 ${docs.length} 篇 Lexical 内容，${types.size} 种节点类型。`, '')
lines.push('## 节点类型', '', '| 类型 | 出现次数 | 所在篇数 | 最大深度 | 关键属性 | 出现在（不超过 2 篇时列出） |', '| --- | --- | --- | --- | --- | --- |')
for (const [type, entry] of [...types].sort((a, b) => b[1].count - a[1].count)) {
  const attrs = [...entry.attrs].map(([name, values]) => `${name}：${[...values].sort().join('、')}`).join('；')
  const where = entry.docs.size <= 2 ? [...entry.docs].join('、') : '—'
  lines.push(`| \`${type}\` | ${entry.count} | ${entry.docs.size} | ${entry.maxDepth} | ${attrs || '—'} | ${where} |`)
}
lines.push('', '## 文本格式', '', '| 格式 | 次数 |', '| --- | --- |')
for (const [label, count] of [...formatUse].sort((a, b) => b[1] - a[1])) lines.push(`| ${label} | ${count} |`)
if (!formatUse.size) lines.push('| （无） | 0 |')
lines.push('', '## 图片与媒体来源', '', '| 节点 · 域名 | 次数 |', '| --- | --- |')
for (const [key, count] of [...imageHosts].sort((a, b) => b[1] - a[1])) lines.push(`| ${key} | ${count} |`)
if (!imageHosts.size) lines.push('| （无） | 0 |')
lines.push('', '## 逐篇概况', '', '| 内容 | 标题 | 节点数 | 最大深度 | 解析 |', '| --- | --- | --- | --- | --- |')
for (const doc of docs) lines.push(`| ${doc.docKey} | ${String(doc.title).replaceAll('|', '\\|')} | ${doc.nodes} | ${doc.depth} | ${doc.error ? `失败：${doc.error}` : '正常'} |`)
console.log(lines.join('\n'))
