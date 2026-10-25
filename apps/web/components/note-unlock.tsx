"use client";

import { Suspense, useActionState, useId, type ReactNode } from "react";
import { unlockNote } from "./note-unlock-action";
import "./comments.css";

type State = { ok: false; message: string } | { ok: true; body: ReactNode } | null;

// 加密手记的密码表单；解锁后在原位置显示正文，刷新页面需要重新输入。
export default function NoteUnlock({ nid }: { nid: number }) {
  const id = useId();
  const [state, action, pending] = useActionState<State, FormData>(
    (_previous, data) => unlockNote(nid, String(data.get("password") ?? "")),
    null,
  );
  // 富文本渲染器按需加载、会挂起；新的 Suspense 边界让结果先提交、显示占位，不卡在“验证中”。
  if (state?.ok) return <Suspense fallback={<p className="post-meta" role="status">正在加载正文…</p>}>{state.body}</Suspense>;
  return (
    <form className="comment-form note-unlock" action={action}>
      <p>这篇手记设置了访问密码。</p>
      <label htmlFor={`${id}-password`}>访问密码</label>
      <input id={`${id}-password`} name="password" type="password" required maxLength={100} autoComplete="off" />
      <div className="comment-actions">
        <button type="submit" disabled={pending}>{pending ? "验证中…" : "查看手记"}</button>
      </div>
      {state && <p className="post-meta" role="alert">{state.message}</p>}
    </form>
  );
}
