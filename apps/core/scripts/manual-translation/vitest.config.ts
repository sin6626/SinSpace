import { resolve } from 'node:path'
import swc from 'unplugin-swc'
import tsconfigPath from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// 手动翻译工具用 vitest 跑（借 Core 测试的 swc + 路径别名，直接调用 Core 自己的解析、还原和哈希代码），不是测试。
// 用法见 manual-translation.spec.ts 开头。
export default defineConfig({
  root: __dirname,
  // 缓存放到 Core 自己的 node_modules 里，不在这个目录下生成 node_modules
  cacheDir: resolve(__dirname, '../../node_modules/.vite-manual-translation'),
  test: {
    include: ['manual-translation.spec.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
  esbuild: false,
  plugins: [
    swc.vite(),
    tsconfigPath({ projects: [resolve(__dirname, '../../tsconfig.json')] }),
  ],
})
