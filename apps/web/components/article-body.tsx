import { cacheLife } from "next/cache";
import type { ReactNode } from "react";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { bundledLanguages, codeToHtml } from "shiki";
import { getApiUrl } from "../lib/config";
import RichContent from "./rich-content";
import "./post-detail.css";

// 服务端用 Shiki 高亮，结果按代码与语言缓存；浅色/深色两套颜色由 post-detail.css 的 light-dark() 切换。
async function highlight(code: string, lang: string) {
  "use cache";
  cacheLife("max");
  return codeToHtml(code, { lang, themes: { light: "github-light", dark: "github-dark" }, defaultColor: false });
}

type HastNode = NonNullable<ExtraProps["node"]>["children"][number];
const textOf = (node: HastNode): string => node.type === "text" ? node.value : "children" in node ? node.children.map(textOf).join("") : "";

async function HighlightedCode({ code, lang }: { code: string; lang: string }) {
  const html = await highlight(code, lang);
  return <div className="code-block" dangerouslySetInnerHTML={{ __html: html }} />;
}

// 代码块：```lang 且 Shiki 支持该语言时高亮，否则保持原样（Shiki 遇到未知语言会报错）。
// 本身保持同步，只有需要高亮时才交给异步的 HighlightedCode（服务端组件）。
function CodeBlock({ node, children }: { children?: ReactNode } & ExtraProps) {
  const code = node?.children[0];
  if (code?.type !== "element" || code.tagName !== "code") return <pre>{children}</pre>;
  const className = code.properties.className;
  const lang = (Array.isArray(className) ? className : []).map(String).find((name) => name.startsWith("language-"))?.slice("language-".length).toLowerCase();
  if (!lang || !(lang in bundledLanguages)) return <pre>{children}</pre>;
  return <HighlightedCode code={textOf(code).replace(/\n$/, "")} lang={lang} />;
}

const components: Components = { pre: CodeBlock };

// 文章、手记、页面共用的正文：Lexical 用同版富文本渲染器，Markdown（以及富文本的兜底）用 react-markdown。
export default function ArticleBody({ text, contentFormat, content, emptyText }: {
  text?: string;
  contentFormat?: string;
  content?: string;
  emptyText: string;
}) {
  const markdown = typeof text === "string" ? (
    <div className="article-body">
      <Markdown remarkPlugins={[remarkGfm]} components={components} skipHtml>{text}</Markdown>
    </div>
  ) : <p role="status">{emptyText}</p>;
  if (contentFormat !== "lexical" || !content) return markdown;
  return <RichContent content={content} apiUrl={getApiUrl()}>{markdown}</RichContent>;
}
