"use client";

import { useId, useState, type FormEvent } from "react";
import "./comments.css";

// 友链申请：直接提交到 Core（POST /links/audit），新申请一律是“待审核”，审核结果由 Core 发邮件通知。
// 字段与长度限制照 Core 的校验：名字和站点名 20 字、描述 50 字、网址必须 https。
export default function LinkApplyForm({ apiUrl }: { apiUrl: string }) {
  const id = useId();
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
        return setStatus({ type: "error", message: typeof message === "string" && message ? message : `提交失败（HTTP ${response.status}）` });
      }
      form.reset();
      setStatus({ type: "done", message: "申请已提交，审核通过后会出现在这里；填了邮箱会收到审核结果。" });
    } catch {
      setStatus({ type: "error", message: "网络错误，申请没有发出去，请稍后重试。" });
    }
  }

  return (
    <form className="comment-form" onSubmit={submit} aria-label="申请友链">
      <div className="comment-fields">
        <label htmlFor={`${id}-author`}>你的名字</label>
        <input id={`${id}-author`} name="author" required maxLength={20} autoComplete="nickname" />
        <label htmlFor={`${id}-name`}>站点名称</label>
        <input id={`${id}-name`} name="name" required maxLength={20} autoComplete="off" />
        <label htmlFor={`${id}-url`}>站点地址</label>
        <input id={`${id}-url`} name="url" type="url" required pattern="https://.+" title="需要以 https:// 开头" placeholder="https://" autoComplete="url" />
      </div>
      <div className="comment-fields">
        <label htmlFor={`${id}-avatar`}>头像地址（可选）</label>
        <input id={`${id}-avatar`} name="avatar" type="url" maxLength={200} placeholder="https://" autoComplete="off" />
        <label htmlFor={`${id}-description`}>一句话介绍（可选）</label>
        <input id={`${id}-description`} name="description" maxLength={50} autoComplete="off" />
        <label htmlFor={`${id}-email`}>邮箱（可选，不公开）</label>
        <input id={`${id}-email`} name="email" type="email" maxLength={50} placeholder="接收审核结果" autoComplete="email" />
      </div>
      <div className="comment-actions">
        <button type="submit" disabled={status.type === "sending"}>{status.type === "sending" ? "提交中…" : "提交申请"}</button>
      </div>
      {(status.type === "done" || status.type === "error") && (
        <p className="post-meta" role={status.type === "error" ? "alert" : "status"}>{status.message}</p>
      )}
    </form>
  );
}
