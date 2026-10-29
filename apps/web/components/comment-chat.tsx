import { unstable_rethrow } from "next/navigation";
import Markdown from "react-markdown";
import { formatDate, formatTime } from "../lib/date";
import { safeUrl } from "../lib/safe-url";
import CommentChatPanel from "./comment-chat-panel";
import type { CommentRefType } from "./comment-form";
import { allowedElements, loadComments, type Thread } from "./comments";
import "./comment-chat.css";

type Item = Omit<Thread, "replies" | "hiddenReplies">;
export type ChatMessage = Item & { quote?: { author: string; text: string } };

// 回复不再缩进成楼中楼：按时间排成一条消息流，回复在气泡顶部引用被回复的那句话（像聊天软件那样）
export function toMessages(threads: Thread[]): ChatMessage[] {
  const snippet = (item: Item) => (item.deleted ? "该评论已删除" : item.text.replace(/[`*_>#~[\]()!-]/g, "").replace(/\s+/g, " ").trim().slice(0, 60));
  return threads
    .flatMap((thread) => {
      const byId = new Map<string, Item>([thread, ...thread.replies].map((item) => [item.id, item]));
      return [thread, ...thread.replies.map((reply) => {
        const parent = byId.get(reply.parentId ?? "") ?? thread;
        return { ...reply, quote: { author: parent.author, text: snippet(parent) } };
      })];
    })
    .sort((a, b) => a.created.localeCompare(b.created));
}

// 服务端渲染消息流（Markdown 不进浏览器包），交给客户端的悬浮窗外壳；“回复”按钮靠 data-reply-* 让外壳接手
export function ChatStream({ messages, canReply, truncated }: { messages: ChatMessage[]; canReply: boolean; truncated: boolean }) {
  if (!messages.length) {
    return (
      <div className="chat-empty">
        <span className="chat-empty-stars" aria-hidden="true" />
        <p>还没有人说话</p>
        <p className="chat-empty-hint">第一句，留给正在读的你。</p>
      </div>
    );
  }
  return (
    <ol className="chat-stream" aria-label="评论消息">
      {truncated && <li className="chat-day"><span>更早的评论在文末评论区</span></li>}
      {messages.flatMap((message, index) => {
        const date = formatDate(message.created);
        const separator = index === 0 || formatDate(messages[index - 1].created) !== date ? [<li key={`day-${date}`} className="chat-day"><span>{date}</span></li>] : [];
        const avatar = safeUrl(message.avatar);
        const site = safeUrl(message.url);
        return [...separator, (
          <li key={message.id} className="chat-message" data-id={message.id} data-owner={message.owner ? "" : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 头像来自 Gravatar 或第三方登录，不走 next/image 白名单 */}
            {avatar ? <img className="chat-avatar" src={avatar} alt="" width={30} height={30} loading="lazy" /> : <span className="chat-avatar" aria-hidden="true" />}
            <div className="chat-body">
              <p className="chat-meta">
                <strong>{site ? <a href={site} target="_blank" rel="noopener noreferrer nofollow ugc">{message.author}</a> : message.author}</strong>
                {message.owner && <span className="chat-badge">博主</span>}
                {message.pinned && <span className="chat-badge">置顶</span>}
                <time dateTime={message.created} title={message.location ? `来自 ${message.location}` : undefined}>{formatTime(message.created)}</time>
              </p>
              <div className="chat-bubble">
                {message.quote && (
                  <p className="chat-quote"><span>@{message.quote.author}</span>{message.quote.text}</p>
                )}
                {message.deleted ? (
                  <p className="chat-deleted">该评论已删除。</p>
                ) : (
                  <div className="chat-text"><Markdown allowedElements={allowedElements} unwrapDisallowed skipHtml>{message.text}</Markdown></div>
                )}
              </div>
              {canReply && !message.deleted && (
                <button type="button" className="chat-reply" data-reply-id={message.id} data-reply-author={message.author}>回复</button>
              )}
            </div>
          </li>
        )];
      })}
    </ol>
  );
}

// 文章侧栏的评论入口：按钮 + 悬浮窗，读到一半也能边看边聊，不用离开读到的位置
export default async function CommentChat({ refId, refType, allowComment, title }: { refId: string; refType: CommentRefType; allowComment: boolean; title: string }) {
  let loaded: Awaited<ReturnType<typeof loadComments>>;
  try {
    loaded = await loadComments(refId, allowComment);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
  const { data, pagination, form, closedReason } = loaded;
  const truncated = pagination.totalPage > 1 || data.some((thread) => thread.hiddenReplies > 0);
  return (
    <CommentChatPanel title={title} total={pagination.total} form={form} closedReason={closedReason} target={{ refId, refType }}>
      <ChatStream messages={toMessages(data)} canReply={!closedReason} truncated={truncated} />
    </CommentChatPanel>
  );
}
