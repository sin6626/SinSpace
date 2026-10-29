import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { murmurImageWidth } from "../lib/murmur";
import { safeUrl } from "../lib/safe-url";

// 碎碎念正文：Markdown 只放行段落级元素（不渲染 HTML、标题），图片按后台拖好的宽度显示（占气泡宽度的百分比）。
const components: Components = {
  img: ({ src, alt, title }) => {
    const href = safeUrl(typeof src === "string" ? src : undefined);
    // eslint-disable-next-line @next/next/no-img-element -- 图床上的图片，尺寸由站长在后台拖定，不走 next/image
    return href ? <img className="murmur-image" src={href} alt={alt ?? ""} loading="lazy" style={{ width: `${murmurImageWidth(title)}%` }} /> : null;
  },
  a: ({ href, children }) => {
    const url = safeUrl(href);
    return url ? <a href={url} target="_blank" rel="noopener noreferrer">{children}</a> : <>{children}</>;
  },
};

export default function MurmurBody({ content }: { content: string }) {
  return (
    <div className="murmur-body">
      <Markdown remarkPlugins={[remarkGfm]} components={components} skipHtml allowedElements={["p", "a", "img", "strong", "em", "del", "code", "pre", "ul", "ol", "li", "blockquote", "br"]} unwrapDisallowed>
        {content}
      </Markdown>
    </div>
  );
}
