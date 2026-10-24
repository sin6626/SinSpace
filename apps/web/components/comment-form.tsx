"use client";

import { useId, useState, type FormEvent } from "react";

export type CommentRefType = "Post" | "Note" | "Page";

type Props = { apiUrl: string } & ({ refId: string; refType: CommentRefType; replyTo?: never } | { replyTo: { id: string; author: string }; refId?: never; refType?: never });

// Core 的报错格式是 { message: string | string[] }，表单校验错误是数组。
async function readError(response: Response) {
  const body = await response.json().catch(() => null) as { message?: unknown } | null;
  const message = Array.isArray(body?.message) ? body.message.join("；") : body?.message;
  return typeof message === "string" && message ? message : `提交失败（HTTP ${response.status}）`;
}

// 游客评论直接从浏览器提交到 Core：Core 按访客 IP 做垃圾过滤、归属地和频率限制，经 Next 转发会全变成服务器 IP。
// 昵称、邮箱、网址交给浏览器自动填充（autocomplete），不在本地另存。
export default function CommentForm({ apiUrl, refId, refType, replyTo }: Props) {
  const id = useId();
  const [open, setOpen] = useState(!replyTo);
  const [status, setStatus] = useState<{ type: "idle" | "sending" } | { type: "done" | "error"; message: string }>({ type: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const body = {
      author: text("author"),
      mail: text("mail"),
      ...(text("url") ? { url: text("url") } : {}),
      text: text("text"),
      isWhispers: data.get("whisper") === "on",
    };
    const path = replyTo ? `/comments/guest/reply/${replyTo.id}` : `/comments/guest/${refId}?ref=${refType}`;
    setStatus({ type: "sending" });
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  if (replyTo && !open) {
    return <button className="comment-reply-button" type="button" onClick={() => setOpen(true)}>回复</button>;
  }
  return (
    <form className="comment-form" onSubmit={submit} aria-label={replyTo ? `回复 ${replyTo.author}` : "发表评论"}>
      <div className="comment-fields">
        <label htmlFor={`${id}-author`}>昵称</label>
        <input id={`${id}-author`} name="author" required maxLength={20} autoComplete="nickname" />
        <label htmlFor={`${id}-mail`}>邮箱（不公开）</label>
        <input id={`${id}-mail`} name="mail" type="email" required maxLength={50} autoComplete="email" placeholder="用于头像和回复通知" />
        <label htmlFor={`${id}-url`}>网站（可选）</label>
        <input id={`${id}-url`} name="url" type="url" maxLength={50} autoComplete="url" placeholder="https://" />
      </div>
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
