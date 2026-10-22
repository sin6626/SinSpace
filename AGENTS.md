<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 项目文档与协作

- 先阅读 [docs/README.md](docs/README.md)，技术决策、设计系统和本地开发规划以其链接的文档为入口。文档中的设计基线与计划功能不代表已经实现或得到最终视觉批准。
- 本项目用于学习。每次先讲清概念、取舍与影响，在用户确认的小步骤内做最小修改，再共同验证；不要自动扩展为大范围改动或整站 UI 生成。已明确授权的同一事项无需重复确认。
- 当前技术方向是直接使用 Base UI 提供交互基础，样式由项目自己设计，配合 Tailwind CSS 和 Motion。shadcn/ui 仅按需参考或选用，不作为默认样式和组件清单；缺少的组件不为凑齐体系而补造。后端与后台复用旧目录中的 Mix Space，旧 Shiro 前端保留。
