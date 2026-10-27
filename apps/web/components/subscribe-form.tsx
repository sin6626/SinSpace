"use client";

import { useState, type FormEvent, type Ref } from "react";

const typeLabels = { post_c: "文章", note_c: "手记" } as const;
type SubscribeType = keyof typeof typeLabels;

// 邮件订阅：直接提交到 Core（POST /subscribe）。有新内容时 Core 发邮件，邮件里带退订链接（指向 Core，不需要前端页面）。
// 注意 Core 不验证邮箱归属，同一邮箱重复订阅只会更新订阅类型。
// 外观是首屏“订阅”浮层里的样子：说明、整行邮箱、可点选的胶囊（文章 / 手记）、RSS 提示、整行订阅按钮。
export default function SubscribeForm({ apiUrl, types, siteName = "这里", emailRef }: { apiUrl: string; types: SubscribeType[]; siteName?: string; emailRef?: Ref<HTMLInputElement> }) {
  const [status, setStatus] = useState<{ type: "idle" | "sending" } | { type: "done" | "error"; message: string }>({ type: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const chosen = data.getAll("types").map(String);
    if (!chosen.length) return setStatus({ type: "error", message: "至少选一种订阅内容。" });
    setStatus({ type: "sending" });
    try {
      const response = await fetch(`${apiUrl}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(data.get("email") ?? "").trim(), types: chosen }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: unknown } | null;
        return setStatus({ type: "error", message: typeof body?.message === "string" ? body.message : `订阅失败（HTTP ${response.status}）` });
      }
      form.reset();
      setStatus({ type: "done", message: "订阅成功，有新内容时会发邮件给你。" });
    } catch {
      setStatus({ type: "error", message: "网络错误，订阅失败。" });
    }
  }

  return (
    <form className="subscribe-form" onSubmit={submit} aria-label="邮件订阅">
      <p className="subscribe-hint">欢迎订阅「{siteName}」，有新的文章或手记时，我会写一封信告诉你。</p>
      <input ref={emailRef} className="field subscribe-email" aria-label="订阅邮箱" name="email" type="email" required maxLength={50} placeholder="留下你的邮箱" autoComplete="email" />
      <fieldset className="subscribe-types">
        <legend>想收到哪些</legend>
        {types.map((type) => (
          <label key={type} className="subscribe-type">
            <input type="checkbox" name="types" value={type} defaultChecked />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            {typeLabels[type]}
          </label>
        ))}
      </fieldset>
      <p className="subscribe-rss">也可以通过 <a href="/feed.xml">RSS</a> 订阅。</p>
      <button className="btn btn-primary subscribe-submit" type="submit" disabled={status.type === "sending"}>{status.type === "sending" ? "订阅中…" : "订阅"}</button>
      {(status.type === "done" || status.type === "error") && (
        <p className={`subscribe-status is-${status.type}`} role={status.type === "error" ? "alert" : "status"}>{status.message}</p>
      )}
    </form>
  );
}
