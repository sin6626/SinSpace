import { unstable_rethrow } from "next/navigation";
import Markdown from "react-markdown";
import { getComments, getSiteSettings } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import { formatDate } from "../lib/date";
import { safeUrl } from "../lib/safe-url";
import CommentForm, { type CommentRefType } from "./comment-form";
import "./comments.css";

type Thread = Awaited<ReturnType<typeof getComments>>["data"][number];
type Comment = Omit<Thread, "replies" | "hiddenReplies">;

// 评论正文按 Markdown 显示，只放行行内与段落级元素，不渲染图片和 HTML。
const allowedElements = ["p", "br", "a", "strong", "em", "del", "code", "pre", "blockquote", "ul", "ol", "li"];

function CommentBody({ comment, replyTo, apiUrl, canReply }: { comment: Comment; replyTo?: string; apiUrl: string; canReply: boolean }) {
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
        {canReply && !comment.deleted && <CommentForm apiUrl={apiUrl} replyTo={{ id: comment.id, author: comment.author }} />}
      </div>
    </article>
  );
}

// 文章、手记、页面详情底部的评论区。allowComment 是这篇内容自己的“允许评论”开关。
export default async function Comments({ refId, refType, allowComment }: { refId: string; refType: CommentRefType; allowComment: boolean }) {
  let result: Awaited<ReturnType<typeof getComments>>;
  let settings: Awaited<ReturnType<typeof getSiteSettings>>["comments"];
  try {
    [result, { comments: settings }] = await Promise.all([getComments(refId, 1), getSiteSettings()]);
  } catch (error) {
    unstable_rethrow(error);
    return <section className="comments" aria-label="评论"><p className="post-empty" role="alert">评论读取失败，请稍后刷新。</p></section>;
  }
  const apiUrl = getApiUrl();
  // 新前端暂不支持读者登录，只能游客评论。
  const closedReason = settings.disabled || !allowComment ? "评论已关闭。" : !settings.allowGuest ? "博主暂未开放游客评论。" : null;
  const canReply = !closedReason;
  const { data, pagination } = result;

  return (
    <section className="comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading">评论{pagination.total > 0 && ` ${pagination.total}`}</h2>
      {closedReason ? <p className="post-meta">{closedReason}</p> : <CommentForm apiUrl={apiUrl} refId={refId} refType={refType} />}
      {data.length ? (
        <ol className="comment-list">
          {data.map((thread) => {
            const authors = new Map([thread, ...thread.replies].map((item) => [item.id, item.author]));
            return (
              <li key={thread.id}>
                <CommentBody comment={thread} apiUrl={apiUrl} canReply={canReply} />
                {thread.replies.length > 0 && (
                  <ol className="comment-replies">
                    {thread.replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentBody comment={reply} replyTo={reply.parentId && reply.parentId !== thread.id ? authors.get(reply.parentId) : undefined} apiUrl={apiUrl} canReply={canReply} />
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
