// 检查脚本里替换 apps/web/lib/i18n/server（它依赖 Next 的 next/root-params，脚本里跑不了）：固定中文文案、地址不加前缀。
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

export function i18nServer(ts) {
  const source = readFileSync(new URL('../../apps/web/lib/i18n/messages/zh.ts', import.meta.url), 'utf8')
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports })
  const zh = module.exports.default
  return { getT: async () => zh, getLocale: async () => 'zh', localize: async (href) => href }
}
