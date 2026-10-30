"use client";

import { Check } from "lucide-react";
import { useState, type FormEvent, type Ref } from "react";
import { useLocale, useT } from "./locale-provider";

type SubscribeType = "post_c" | "note_c";

// 邮件订阅：直接提交到 Core（POST /subscribe）。有新内容时 Core 发邮件，邮件里带退订链接（指向 Core，不需要前端页面）。
// 注意 Core 不验证邮箱归属，同一邮箱重复订阅只会更新订阅类型。
// 外观是首屏“订阅”浮层里的样子：说明、整行邮箱、可点选的胶囊（文章 / 手记）、RSS 提示、整行订阅按钮。
export default function SubscribeForm({ apiUrl, types, siteName, emailRef }: { apiUrl: string; types: SubscribeType[]; siteName?: string; emailRef?: Ref<HTMLInputElement> }) {
  const t = useT().subscribe;
  const locale = useLocale();
  const [status, setStatus] = useState<{ type: "idle" | "sending" } | { type: "done" | "error"; message: string }>({ type: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const chosen = data.getAll("types").map(String);
    if (!chosen.length) return setStatus({ type: "error", message: t.needOne });
    setStatus({ type: "sending" });
    try {
      const response = await fetch(`${apiUrl}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(data.get("email") ?? "").trim(), types: chosen }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: unknown } | null;
        return setStatus({ type: "error", message: locale === "zh" && typeof body?.message === "string" ? body.message : t.failed(response.status) });
      }
      form.reset();
      setStatus({ type: "done", message: t.done });
    } catch {
      setStatus({ type: "error", message: t.network });
    }
  }

  return (
    <form className="subscribe-form" onSubmit={submit} aria-label={t.formLabel}>
      <p className="subscribe-hint">{t.hint(siteName ?? t.defaultSite)}</p>
      <input ref={emailRef} className="field subscribe-email" aria-label={t.email} name="email" type="email" required maxLength={50} placeholder={t.emailPlaceholder} autoComplete="email" />
      <fieldset className="subscribe-types">
        <legend>{t.legend}</legend>
        {types.map((type) => (
          <label key={type} className="subscribe-type">
            <input type="checkbox" name="types" value={type} defaultChecked />
            <Check size={14} strokeWidth={2.5} aria-hidden="true" />
            {t.types[type]}
          </label>
        ))}
      </fieldset>
      <p className="subscribe-rss">{t.rssBefore}<a href="/feed.xml">RSS</a>{t.rssAfter}</p>
      <button className="btn btn-primary subscribe-submit" type="submit" disabled={status.type === "sending"}>{status.type === "sending" ? t.sending : t.submit}</button>
      {(status.type === "done" || status.type === "error") && (
        <p className={`subscribe-status is-${status.type}`} role={status.type === "error" ? "alert" : "status"}>{status.message}</p>
      )}
    </form>
  );
}
