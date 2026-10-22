import { defineConfig } from 'tsdown'
import swc from 'unplugin-swc'

export default defineConfig({
  clean: false,
  plugins: [swc.rollup()],
  target: 'es2023',
  entry: ['src/main.ts'],
  dts: false,
  platform: 'node',
  deps: {
    alwaysBundle: /^(?!sharp(?:\/|$))/,
    neverBundle: ['sharp'],
    onlyBundle: false,
  },
  format: ['esm'],
  outDir: 'out',
  sourcemap: true,
  shims: true,
})
