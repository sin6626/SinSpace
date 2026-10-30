"use client";

import { useId, useState, type FormEvent } from "react";
import { useLocale, useT } from "./locale-provider";
import "./comments.css";

// 友链申请：直接提交到 Core（POST /links/audit），新申请一律是“待审核”，审核结果由 Core 发邮件通知。
// 字段与长度限制照 Core 的校验：名字和站点名 20 字、描述 50 字、网址必须 https。
export default function LinkApplyForm({ apiUrl }: { apiUrl: string }) {
  const id = useId();
  const t = useT().friends;
  const chinese = useLocale() === "zh";
  const [status, setStatus] = useState<{ type: "idle" | "sending" } | { type: "done" | "error"; message: string }>({ type: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const optional = (name: string) => text(name) ? { [name]: text(name) } : {};
    setStatus({ type: "sending" });
    try {
      const response = await fetch(`${apiUrl}/links/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: text("author"), name: text("name"), url: text("url"), ...optional("avatar"), ...optional("description"), ...optional("email") }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: unknown } | null;
        const message = Array.isArray(body?.message) ? body.message.join("；") : body?.message;
        return setStatus({ type: "error", message: chinese && typeof message === "string" && message ? message : t.failed(response.status) });
      }
      form.reset();
      setStatus({ type: "done", message: t.done });
    } catch {
      setStatus({ type: "error", message: t.network });
    }
  }

  return (
    <form className="comment-form" onSubmit={submit} aria-label={t.apply}>
      <div className="comment-fields">
        <label htmlFor={`${id}-author`}>{t.yourName}</label>
        <input className="field" id={`${id}-author`} name="author" required maxLength={20} autoComplete="nickname" />
        <label htmlFor={`${id}-name`}>{t.siteName}</label>
        <input className="field" id={`${id}-name`} name="name" required maxLength={20} autoComplete="off" />
        <label htmlFor={`${id}-url`}>{t.siteUrl}</label>
        <input className="field" id={`${id}-url`} name="url" type="url" required pattern="https://.+" title={t.httpsOnly} placeholder="https://" autoComplete="url" />
      </div>
      <div className="comment-fields">
        <label htmlFor={`${id}-avatar`}>{t.avatar}</label>
        <input className="field" id={`${id}-avatar`} name="avatar" type="url" maxLength={200} placeholder="https://" autoComplete="off" />
        <label htmlFor={`${id}-description`}>{t.introOptional}</label>
        <input className="field" id={`${id}-description`} name="description" maxLength={50} autoComplete="off" />
        <label htmlFor={`${id}-email`}>{t.email}</label>
        <input className="field" id={`${id}-email`} name="email" type="email" maxLength={50} placeholder={t.emailPlaceholder} autoComplete="email" />
      </div>
      <div className="comment-actions">
        <button className="btn btn-primary" type="submit" disabled={status.type === "sending"}>{status.type === "sending" ? t.sending : t.submit}</button>
      </div>
      {(status.type === "done" || status.type === "error") && (
        <p className="post-meta" role={status.type === "error" ? "alert" : "status"}>{status.message}</p>
      )}
    </form>
  );
}
