import UnoCSS from 'unocss/vite'

import { defineConfig, loadEnv } from 'vite'
import { checker } from 'vite-plugin-checker'


import tsconfigPaths from 'vite-tsconfig-paths'
import type { PluginOption } from 'vite'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueInspector from 'vite-plugin-vue-inspector'

import PKG from './package.json'

// dns.setDefaultResultOrder('verbatim')
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const { VITE_APP_PUBLIC_URL } = env
  const isDev = mode === 'development'

  return defineConfig({
    plugins: [
      // mkcert(),
      UnoCSS(),
      vue({}),
      vueJsx(),
      {
        name: 'vue-jsx-dependency-scan',
        // The scanner reparses transformed TSX as JS, so JSX must not remain.
        config: () => ({
          optimizeDeps: {
            rolldownOptions: {
              transform: { jsx: { runtime: 'automatic', importSource: 'vue' } },
            },
          },
        }),
      },
      tsconfigPaths(),

      ...(isDev
        ? [
            // 悬浮按钮固定在角落会挡住页面按钮且不能拖动，改为不显示，用快捷键开关（Mac ⌘+Shift，其他系统 Ctrl+Shift）。
            VueInspector({
              toggleButtonVisibility: 'never',
              // 本机用 VS Code；code 命令不在 PATH 里，直接用 App 自带的命令行（可用环境变量 LAUNCH_EDITOR 覆盖）。
              launchEditor:
                process.env.LAUNCH_EDITOR ??
                '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
            }),
          ]
        : []),

      checker({
        enableBuild: true,
      }),
      htmlPlugin(env),
      // nodePolyfills({
      //   // To exclude specific polyfills, add them to this list.
      //   exclude: [
      //     'fs', // Excludes the polyfill for `fs` and `node:fs`.
      //   ],
      //   // Whether to polyfill `node:` protocol imports.
      //   protocolImports: true,
      // }),
    ],

    resolve: {
      dedupe: ['@haklex/rich-editor'],
      alias: {
        path: 'path-browserify',
        os: 'os-browserify',
        'node-fetch': 'isomorphic-fetch',
        buffer: 'buffer',
      },
    },

    build: {
      chunkSizeWarningLimit: 2500,
      target: 'esnext',

      // sourcemap: true,
      rollupOptions: {
        output: {
          chunkFileNames: `js/[name]-[hash].js`,
          entryFileNames: `js/[name]-[hash].js`,
        },
      },
    },
    optimizeDeps: {
      exclude: ['@huacnlee/autocorrect', '@dqbd/tiktoken'],
    },

    define: {
      __DEV__: isDev,
    },
    base: !isDev ? VITE_APP_PUBLIC_URL || '' : '',

    server: {
      // https: true,
      port: 9528,
    },
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: 'vue',
      },
    },
  })
}

const htmlPlugin: (env: any) => PluginOption = (env) => {
  return {
    name: 'html-transform',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(
          '<!-- MX SPACE ADMIN DASHBOARD VERSION INJECT -->',
          `<script>window.version = '${PKG.version}';</script>`,
        )
        .replace(/@gh-pages/g, `@page_v${PKG.version}`)
        .replace(
          '<!-- ENV INJECT -->',
          `<script id="env_injection">window.injectData = {WEB_URL:'${env.VITE_APP_WEB_URL || ''
          }', GATEWAY: '${env.VITE_APP_GATEWAY || ''}',BASE_API: '${env.VITE_APP_BASE_API || ''
          }'}</script>`,
        )
    },
  }
}
