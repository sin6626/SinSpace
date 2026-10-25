"use client";

import { useId, useState, type FormEvent } from "react";

const typeLabels = { post_c: "新文章", note_c: "新手记" } as const;
type SubscribeType = keyof typeof typeLabels;

// 邮件订阅：直接提交到 Core（POST /subscribe）。有新内容时 Core 发邮件，邮件里带退订链接（指向 Core，不需要前端页面）。
// 注意 Core 不验证邮箱归属，同一邮箱重复订阅只会更新订阅类型。
export default function SubscribeForm({ apiUrl, types }: { apiUrl: string; types: SubscribeType[] }) {
  const id = useId();
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
    <form className="details-section subscribe-form" onSubmit={submit} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>邮件订阅</h2>
      <input className="sidebar-search-input" aria-label="订阅邮箱" name="email" type="email" required maxLength={50} placeholder="你的邮箱" autoComplete="email" />
      <div className="subscribe-types">
        {types.map((type) => (
          <label key={type}><input type="checkbox" name="types" value={type} defaultChecked /> {typeLabels[type]}</label>
        ))}
        <button type="submit" disabled={status.type === "sending"}>{status.type === "sending" ? "订阅中…" : "订阅"}</button>
      </div>
      {(status.type === "done" || status.type === "error") && (
        <p className="details-message" role={status.type === "error" ? "alert" : "status"}>{status.message}</p>
      )}
    </form>
  );
}
