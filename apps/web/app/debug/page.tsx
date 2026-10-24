import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleBody from "@/components/article-body";
import BlogNavigation from "@/components/navigation-menu";
import ToastButtons from "./toast-buttons";

export const metadata: Metadata = { title: "调试" };

const sampleMarkdown = `## 二级标题

正文段落，包含[链接](/posts)和行内代码 \`revalidateTag\`。

### 三级标题

- 无序列表项
- 第二项

1. 有序列表项
2. 第二项

> 引用内容

\`\`\`ts
export const answer = 42;
\`\`\`

| 列 A | 列 B |
| --- | --- |
| 单元格 | 单元格 |
`;

// 仅开发环境：集中展示平时很难看到的组件状态，样式和真实页面共用。
export default function DebugPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <header className="page-heading">
        <h1>调试</h1>
        <p className="post-meta">仅开发环境可见，集中展示平时不容易看到的组件状态。</p>
      </header>
      <div className="post-list-content">
        <ul className="post-list">
          <li>
            <h2>导航菜单</h2>
            <p className="post-meta">navigation.tsx 的加载占位</p>
            <p className="navigation-message" role="status">正在读取导航…</p>
            <p className="post-meta">navigation-menu.tsx 的三种状态，悬停或点击“文章”查看弹层</p>
            <p className="post-meta">读取中</p>
            <BlogNavigation state={{ status: "loading" }} />
            <p className="post-meta">读取失败</p>
            <BlogNavigation state={{ status: "error" }} />
            <p className="post-meta">没有分类和页面</p>
            <BlogNavigation state={{ status: "ready", articles: [], pages: [] }} />
          </li>
          <li>
            <h2>文章列表</h2>
            <p className="post-meta">posts/page.tsx 的加载占位</p>
            <p className="post-list-content" role="status">正在读取文章…</p>
            <p className="post-meta">post-list.tsx 的读取失败</p>
            <p className="post-list-content" role="alert">文章读取失败。<Link href="/debug">重试</Link></p>
            <p className="post-meta">post-list.tsx 的空列表</p>
            <p className="post-empty">还没有已发布的文章。</p>
            <p className="post-empty">这个分类下还没有已发布的文章。</p>
          </li>
          <li>
            <h2>首页</h2>
            <p className="post-meta">app/page.tsx 的加载占位，home-latest.tsx 单块读取失败与无内容</p>
            <p className="post-list-content" role="status">正在读取最新内容…</p>
            <p className="post-empty" role="alert">最新文章读取失败，请稍后刷新。</p>
            <p className="post-empty">暂无内容。</p>
          </li>
          <li>
            <h2>搜索与筛选</h2>
            <p className="post-meta">post-filter.tsx、note-filter.tsx 共用 result-list.tsx：无结果、读取失败；右栏 post-sidebar / note-sidebar 读取失败</p>
            <p className="post-empty">没有匹配的文章，换个关键词试试。</p>
            <p className="post-empty" role="alert">读取失败，请稍后重试。</p>
            <p className="post-meta">标签读取失败。</p>
          </li>
          <li>
            <h2>手记与作品</h2>
            <p className="post-meta">notes/page.tsx、projects/page.tsx 的加载占位</p>
            <p className="post-list-content" role="status">正在读取手记…</p>
            <p className="post-list-content" role="status">正在读取作品…</p>
            <p className="post-meta">note-list.tsx、project-list.tsx 的读取失败与空列表</p>
            <p className="post-list-content" role="alert">手记读取失败。<Link href="/debug">重试</Link></p>
            <p className="post-empty">还没有公开的手记。</p>
            <p className="post-empty">还没有作品。</p>
            <p className="post-meta">note-detail.tsx：Core 对加密手记返回 403 时</p>
            <p className="post-list-content" role="status">这篇手记设置了访问密码，暂不支持在这里查看。<Link href="/notes">返回手记列表</Link></p>
          </li>
          <li>
            <h2>友链、一言与思考</h2>
            <p className="post-meta">friends/says/thinking 的加载占位，friend-list.tsx、say-list.tsx、thinking-list.tsx 的读取失败与空列表</p>
            <p className="post-list-content" role="status">正在读取友链…</p>
            <p className="post-list-content" role="alert">友链读取失败。<Link href="/debug">重试</Link></p>
            <p className="post-empty">还没有友链。</p>
            <p className="post-empty">还没有一言。</p>
            <p className="post-empty">还没有思考。</p>
          </li>
          <li>
            <h2>评论</h2>
            <p className="post-meta">comments.tsx 的加载占位、读取失败、空列表与关闭状态；comment-form.tsx 的提交结果文案（真实表单见任意文章底部）</p>
            <p className="post-meta" role="status">正在读取评论…</p>
            <p className="post-empty" role="alert">评论读取失败，请稍后刷新。</p>
            <p className="post-empty">还没有评论，来说两句吧。</p>
            <p className="post-meta">评论已关闭。</p>
            <p className="post-meta">博主暂未开放游客评论。</p>
            <p className="post-meta" role="status">评论已发送。博主开启审核时，通过后才会显示；列表约一分钟内更新。</p>
            <p className="post-meta" role="status">悄悄话已发送，只有博主能看到。</p>
            <p className="post-meta" role="alert">网络错误，评论没有发出去，请稍后重试。</p>
          </li>
          <li>
            <h2>通知 Toast</h2>
            <p className="post-meta">文案来自 lib/notification-copy.ts，只在本页弹出，不走 WebSocket，也不清缓存</p>
            <ToastButtons />
          </li>
          <li>
            <h2>文章正文</h2>
            <p className="post-meta">直接使用详情页的 article-body（Markdown + Shiki 高亮）；Lexical 富文本见任意 Lexical 文章</p>
            <ArticleBody text={sampleMarkdown} emptyText="" />
          </li>
          <li>
            <h2>页面切换动画</h2>
            <p className="post-meta">点击左侧任意导航即可看到，样式在 globals.css 末尾的 page-switch</p>
          </li>
        </ul>
      </div>
    </>
  );
}
