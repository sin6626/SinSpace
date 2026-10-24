import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

import { cwd, isDev } from '~/global/env.global'

export const HOME = homedir()

const configuredDataDir = process.env.MX_DATA_DIR
if (configuredDataDir && !isAbsolute(configuredDataDir)) {
  throw new Error('MX_DATA_DIR must be an absolute path')
}

// 临时目录必须与数据目录分开：每天 3 点的 cleanTempDirectory 会 rm -r 整个 TEMP_DIR。
// 上游写法在配置 MX_DATA_DIR 或开发模式下让 TEMP_DIR 与 DATA_DIR 指向同一路径，
// 2026-10-24 03:00 因此删掉了全部上传文件（static）。现在两种情况都使用数据目录下独立的 temp。
export const TEMP_DIR = configuredDataDir
  ? join(configuredDataDir, 'temp')
  : isDev
    ? join(cwd, './tmp/temp')
    : '/tmp/mx-space'

export const DATA_DIR =
  configuredDataDir || (isDev ? join(cwd, './tmp') : join(HOME, '.mx-space'))

export const THEME_DIR = join(DATA_DIR, 'theme')

export const USER_ASSET_DIR = join(DATA_DIR, 'assets')

export const STATIC_FILE_DIR = join(DATA_DIR, 'static')
export const STATIC_FILE_TRASH_DIR = join(TEMP_DIR, 'trash')

export const BACKUP_DIR = !isDev
  ? join(DATA_DIR, 'backup')
  : join(TEMP_DIR, 'backup')

// Swarm/容器环境下，更新后的 admin 资源需要落到持久化数据目录。
export const LOCAL_ADMIN_ASSET_PATH = join(DATA_DIR, 'admin')
export const BUNDLED_ADMIN_ASSET_PATH = isDev
  ? LOCAL_ADMIN_ASSET_PATH
  : join(cwd, './admin')

export const resolveAdminAssetRoot = (relativePath = 'index.html') => {
  for (const basePath of [LOCAL_ADMIN_ASSET_PATH, BUNDLED_ADMIN_ASSET_PATH]) {
    if (existsSync(join(basePath, relativePath))) {
      return basePath
    }
  }

  return LOCAL_ADMIN_ASSET_PATH
}

export const NODE_REQUIRE_PATH = join(DATA_DIR, 'node_modules')
