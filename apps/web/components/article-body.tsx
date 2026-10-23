import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getApiUrl } from "../lib/config";
import RichContent from "./rich-content";
import "./post-detail.css";

// 文章、手记、页面共用的正文：Lexical 用同版富文本渲染器，Markdown（以及富文本的兜底）用 react-markdown。
export default function ArticleBody({ text, contentFormat, content, emptyText }: {
  text?: string;
  contentFormat?: string;
  content?: string;
  emptyText: string;
}) {
  const markdown = typeof text === "string" ? (
    <div className="article-body">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml>{text}</Markdown>
    </div>
  ) : <p role="status">{emptyText}</p>;
  if (contentFormat !== "lexical" || !content) return markdown;
  return <RichContent content={content} apiUrl={getApiUrl()}>{markdown}</RichContent>;
}
