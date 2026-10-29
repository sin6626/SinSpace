import { unstable_rethrow } from "next/navigation";
import Markdown from "react-markdown";
import { getComments, getLoginProviders, getSiteSettings } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import { formatDate } from "../lib/date";
import { safeUrl } from "../lib/safe-url";
import CommentForm, { type CommentRefType } from "./comment-form";
import type { LoginProvider } from "./reader-session";
import "./comments.css";

export type Thread = Awaited<ReturnType<typeof getComments>>["data"][number];
type Comment = Omit<Thread, "replies" | "hiddenReplies">;

// 评论正文按 Markdown 显示，只放行行内与段落级元素，不渲染图片和 HTML。
export const allowedElements = ["p", "br", "a", "strong", "em", "del", "code", "pre", "blockquote", "ul", "ol", "li"];

export type FormOptions = { apiUrl: string; allowGuest: boolean; providers: LoginProvider[] };

function CommentBody({ comment, replyTo, form, canReply }: { comment: Comment; replyTo?: string; form: FormOptions; canReply: boolean }) {
  const avatar = safeUrl(comment.avatar);
  const site = safeUrl(comment.url);
  return (
    <article className="comment" id={`comment-${comment.id}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 头像来自 Gravatar 或第三方登录，不走 next/image 白名单 */}
      {avatar ? <img className="comment-avatar" src={avatar} alt="" width={36} height={36} loading="lazy" /> : <span className="comment-avatar" aria-hidden="true" />}
      <div className="comment-main">
        <p className="comment-meta">
          <strong>{site ? <a href={site} target="_blank" rel="noopener noreferrer nofollow ugc">{comment.author}</a> : comment.author}</strong>
          {replyTo && <span>回复 @{replyTo}</span>}
          <time dateTime={comment.created}>{formatDate(comment.created)}</time>
          {comment.location && <span>来自 {comment.location}</span>}
          {comment.pinned && <span>置顶</span>}
        </p>
        {comment.deleted ? (
          <p className="comment-deleted">该评论已删除。</p>
        ) : (
          <div className="comment-text">
            <Markdown allowedElements={allowedElements} unwrapDisallowed skipHtml>{comment.text}</Markdown>
          </div>
        )}
        {canReply && !comment.deleted && <CommentForm {...form} replyTo={{ id: comment.id, author: comment.author }} />}
      </div>
    </article>
  );
}

// 评论列表、表单参数和“为什么不能评论”：文末评论区与文章侧栏的评论悬浮窗（comment-chat.tsx）共用，数据走同一份缓存。
export async function loadComments(refId: string, allowComment: boolean) {
  const [result, { comments: settings }, providers] = await Promise.all([getComments(refId, 1), getSiteSettings(), getLoginProviders().catch((): LoginProvider[] => [])]);
  const form: FormOptions = { apiUrl: getApiUrl(), allowGuest: settings.allowGuest, providers };
  // 关闭游客评论但启用了第三方登录时，表单里只给登录按钮；两者都没有才算无法评论。
  const closedReason = settings.disabled || !allowComment ? "评论已关闭。" : !settings.allowGuest && !providers.length ? "博主暂未开放游客评论。" : null;
  return { ...result, form, closedReason };
}

// 文章、手记、页面详情底部的评论区。allowComment 是这篇内容自己的“允许评论”开关。
export default async function Comments({ refId, refType, allowComment }: { refId: string; refType: CommentRefType; allowComment: boolean }) {
  let loaded: Awaited<ReturnType<typeof loadComments>>;
  try {
    loaded = await loadComments(refId, allowComment);
  } catch (error) {
    unstable_rethrow(error);
    return <section className="comments" aria-label="评论"><p className="post-empty" role="alert">评论读取失败，请稍后刷新。</p></section>;
  }
  const { data, pagination, form, closedReason } = loaded;
  const canReply = !closedReason;

  return (
    <section className="comments" id="comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading">评论{pagination.total > 0 && ` ${pagination.total}`}</h2>
      {closedReason ? <p className="post-meta">{closedReason}</p> : <CommentForm {...form} refId={refId} refType={refType} />}
      {data.length ? (
        <ol className="comment-list">
          {data.map((thread) => {
            const authors = new Map([thread, ...thread.replies].map((item) => [item.id, item.author]));
            return (
              <li key={thread.id}>
                <CommentBody comment={thread} form={form} canReply={canReply} />
                {thread.replies.length > 0 && (
                  <ol className="comment-replies">
                    {thread.replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentBody comment={reply} replyTo={reply.parentId && reply.parentId !== thread.id ? authors.get(reply.parentId) : undefined} form={form} canReply={canReply} />
                      </li>
                    ))}
                    {thread.hiddenReplies > 0 && <li className="post-meta">还有 {thread.hiddenReplies} 条回复暂未显示。</li>}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      ) : !closedReason && <p className="post-empty">还没有评论，来说两句吧。</p>}
      {pagination.totalPage > 1 && <p className="post-meta">只显示最新的 {data.length} 条评论。</p>}
    </section>
  );
}
