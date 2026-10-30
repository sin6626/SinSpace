"use client";

import { Suspense, useActionState, useId, type ReactNode } from "react";
import { unlockNote } from "./note-unlock-action";
import { useT } from "./locale-provider";
import "./comments.css";

type State = { ok: false; reason: "needPassword" | "wrongPassword" | "failed" } | { ok: true; body: ReactNode } | null;

// 加密手记的密码表单；解锁后在原位置显示正文，刷新页面需要重新输入。
export default function NoteUnlock({ nid }: { nid: number }) {
  const id = useId();
  const { notes: t, list } = useT();
  const [state, action, pending] = useActionState<State, FormData>(
    (_previous, data) => unlockNote(nid, String(data.get("password") ?? ""), t.noBody),
    null,
  );
  // 富文本渲染器按需加载、会挂起；新的 Suspense 边界让结果先提交、显示占位，不卡在“验证中”。
  if (state?.ok) return <Suspense fallback={<p className="post-meta" role="status">{t.loadingBody}</p>}>{state.body}</Suspense>;
  return (
    <form className="comment-form note-unlock" action={action}>
      <p>{t.lockedHint}</p>
      <label htmlFor={`${id}-password`}>{t.password}</label>
      <input className="field" id={`${id}-password`} name="password" type="password" required maxLength={100} autoComplete="off" />
      <div className="comment-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? t.verifying : t.unlock}</button>
      </div>
      {state && <p className="post-meta" role="alert">{state.reason === "failed" ? list.genericFailed : t[state.reason]}</p>}
    </form>
  );
}
