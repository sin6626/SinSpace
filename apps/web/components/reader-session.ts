"use client";

import { useSyncExternalStore } from "react";

// 读者登录状态（Core 的 Better Auth 会话）。每个访客各不相同，只能在浏览器里读，不能进服务端缓存。
// 登录 Cookie 由 Core 下发且 HttpOnly，所有请求都要 credentials: "include" 才会带上。
export type Reader = { name: string; image?: string; isOwner: boolean };
type State = { status: "loading" } | { status: "guest" } | { status: "reader"; reader: Reader };

let state: State = { status: "loading" };
let loaded: string | null = null;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function load(apiUrl: string) {
  try {
    const response = await fetch(`${apiUrl}/auth/get-session`, { credentials: "include" });
    const session = response.ok ? await response.json() as { user?: { name?: string; image?: string | null; role?: string } } | null : null;
    const user = session?.user;
    set(user ? { status: "reader", reader: { name: user.name || "读者", image: user.image ?? undefined, isOwner: user.role === "owner" } } : { status: "guest" });
  } catch {
    set({ status: "guest" });
  }
}

export function useReaderSession(apiUrl: string) {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      if (loaded !== apiUrl) {
        loaded = apiUrl;
        void load(apiUrl);
      }
      return () => listeners.delete(onChange);
    },
    () => state,
    () => state,
  );
}

// 跳到 GitHub 授权，完成后 Core 再把访客送回当前页面的评论区。
export async function signInWithGitHub(apiUrl: string) {
  const callbackURL = `${location.origin}${location.pathname}${location.search}#comments`;
  const response = await fetch(`${apiUrl}/auth/sign-in/social`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "github", callbackURL, disableRedirect: true }),
  });
  const result = await response.json().catch(() => null) as { url?: string; message?: string } | null;
  if (!response.ok || !result?.url?.startsWith("https://github.com/")) throw new Error(result?.message || "登录跳转失败");
  location.assign(result.url);
}

export async function signOut(apiUrl: string) {
  await fetch(`${apiUrl}/auth/sign-out`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
  set({ status: "guest" });
}
