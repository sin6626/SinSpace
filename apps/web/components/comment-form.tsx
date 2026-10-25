"use client";

import { useId, useState, type FormEvent } from "react";
import { signInWithGitHub, signOut, useReaderSession } from "./reader-session";

export type CommentRefType = "Post" | "Note" | "Page" | "Recently";

// allowGuest：后台是否允许游客评论；github：后台是否启用了 GitHub 登录。
type Props = { apiUrl: string; allowGuest: boolean; github: boolean } & ({ refId: string; refType: CommentRefType; replyTo?: never } | { replyTo: { id: string; author: string }; refId?: never; refType?: never });

// Core 的报错格式是 { message: string | string[] }，表单校验错误是数组。
async function readError(response: Response) {
  const body = await response.json().catch(() => null) as { message?: unknown } | null;
  const message = Array.isArray(body?.message) ? body.message.join("；") : body?.message;
  return typeof message === "string" && message ? message : `提交失败（HTTP ${response.status}）`;
}

// 评论直接从浏览器提交到 Core：Core 按访客 IP 做垃圾过滤、归属地和频率限制，经 Next 转发会全变成服务器 IP。
// 游客填昵称、邮箱、网址（交给浏览器自动填充，不在本地另存）；GitHub 登录后的读者走读者接口，身份取自 Core 的登录 Cookie。
export default function CommentForm({ apiUrl, allowGuest, github, refId, refType, replyTo }: Props) {
  const id = useId();
  const session = useReaderSession(apiUrl);
  const reader = session.status === "reader" ? session.reader : null;
  const [open, setOpen] = useState(!replyTo);
  const [status, setStatus] = useState<{ type: "idle" | "sending" } | { type: "done" | "error"; message: string }>({ type: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const body = {
      ...(reader ? {} : { author: text("author"), mail: text("mail"), ...(text("url") ? { url: text("url") } : {}) }),
      text: text("text"),
      isWhispers: data.get("whisper") === "on",
    };
    const role = reader ? "reader" : "guest";
    const path = replyTo ? `/comments/${role}/reply/${replyTo.id}` : `/comments/${role}/${refId}?ref=${refType}`;
    setStatus({ type: "sending" });
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // 读者评论要带上 Core 的登录 Cookie；游客不带，避免博主在同一浏览器登录后台时被当成博主发言。
        credentials: reader ? "include" : "omit",
      });
      if (!response.ok) return setStatus({ type: "error", message: await readError(response) });
      form.reset();
      setStatus({
        type: "done",
        message: body.isWhispers
          ? "悄悄话已发送，只有博主能看到。"
          : "评论已发送。博主开启审核时，通过后才会显示；列表约一分钟内更新。",
      });
    } catch {
      setStatus({ type: "error", message: "网络错误，评论没有发出去，请稍后重试。" });
    }
  }

  async function login() {
    setStatus({ type: "sending" });
    try {
      await signInWithGitHub(apiUrl);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "登录跳转失败" });
    }
  }

  if (replyTo && !open) {
    return <button className="comment-reply-button" type="button" onClick={() => setOpen(true)}>回复</button>;
  }
  // 不允许游客评论时，未登录的访客只能先登录。
  if (!reader && !allowGuest) {
    if (session.status === "loading" || !github) return null;
    return (
      <div className="comment-identity">
        <button type="button" onClick={login} disabled={status.type === "sending"}>用 GitHub 登录后评论</button>
        {status.type === "error" && <p className="post-meta" role="alert">{status.message}</p>}
      </div>
    );
  }
  return (
    <form className="comment-form" onSubmit={submit} aria-label={replyTo ? `回复 ${replyTo.author}` : "发表评论"}>
      {reader ? (
        <div className="comment-identity">
          {/* eslint-disable-next-line @next/next/no-img-element -- GitHub 头像，不走 next/image 白名单 */}
          {reader.image && <img className="comment-avatar" src={reader.image} alt="" width={28} height={28} />}
          <span>以 <strong>{reader.name}</strong> 的身份评论</span>
          {!replyTo && <button type="button" onClick={() => void signOut(apiUrl)}>退出</button>}
        </div>
      ) : !replyTo && github && session.status === "guest" && (
        <div className="comment-identity">
          <button type="button" onClick={login} disabled={status.type === "sending"}>用 GitHub 登录</button>
          <span className="post-meta">或以游客身份填写下方信息</span>
        </div>
      )}
      {!reader && <div className="comment-fields">
        <label htmlFor={`${id}-author`}>昵称</label>
        <input id={`${id}-author`} name="author" required maxLength={20} autoComplete="nickname" />
        <label htmlFor={`${id}-mail`}>邮箱（不公开）</label>
        <input id={`${id}-mail`} name="mail" type="email" required maxLength={50} autoComplete="email" placeholder="用于头像和回复通知" />
        <label htmlFor={`${id}-url`}>网站（可选）</label>
        <input id={`${id}-url`} name="url" type="url" maxLength={50} autoComplete="url" placeholder="https://" />
      </div>}
      <label htmlFor={`${id}-text`}>{replyTo ? `回复 @${replyTo.author}` : "评论内容"}</label>
      <textarea id={`${id}-text`} name="text" required maxLength={500} rows={replyTo ? 3 : 4} placeholder="支持 Markdown，最多 500 字" />
      <div className="comment-actions">
        <label><input type="checkbox" name="whisper" /> 悄悄话（仅博主可见）</label>
        {replyTo && <button type="button" onClick={() => { setOpen(false); setStatus({ type: "idle" }); }}>取消</button>}
        <button type="submit" disabled={status.type === "sending"}>{status.type === "sending" ? "发送中…" : "发送"}</button>
      </div>
      {(status.type === "done" || status.type === "error") && (
        <p className="post-meta" role={status.type === "error" ? "alert" : "status"}>{status.message}</p>
      )}
    </form>
  );
}
