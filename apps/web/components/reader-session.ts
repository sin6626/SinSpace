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

// 登录失败时 Core（Better Auth）默认跳到它自己的英文错误页，页上的“返回首页”会把人带到 Core 根地址。
// 这里让失败也回到当前页的评论区：地址带 github_login=failed，Better Auth 再追加 error=错误码。
const loginErrorMessages: Record<string, string> = {
  state_mismatch: "登录校验没通过：浏览器没有带上登录用的 Cookie。请确认博客和 Core 用同一个主机打开（本地统一用 127.0.0.1，不要用 localhost），并且浏览器没有拦截本站 Cookie。",
  access_denied: "你取消了 GitHub 授权。",
  invalid_code: "GitHub 授权码无效或已过期，请重新登录。",
  account_not_linked: "这个 GitHub 账号的邮箱已被其他账号使用，没能自动关联。",
  unable_to_get_user_info: "没能从 GitHub 读取到你的资料，请确认授权时允许读取邮箱。",
};
let loginError: string | null | undefined;
const noSubscribe = () => () => {};

function readLoginError() {
  if (loginError !== undefined) return loginError;
  const url = new URL(location.href);
  if (url.searchParams.get("github_login") !== "failed") return (loginError = null);
  const code = url.searchParams.get("error") || "unknown";
  loginError = `${loginErrorMessages[code] ?? "GitHub 登录失败，请稍后重试。"}（错误码 ${code}）`;
  for (const key of ["github_login", "error", "error_description"]) url.searchParams.delete(key);
  // 只提示一次：把参数从地址栏去掉，刷新后不再出现。
  queueMicrotask(() => history.replaceState(history.state, "", url));
  return loginError;
}

export function useLoginError() {
  return useSyncExternalStore(noSubscribe, readLoginError, () => null);
}

// 跳到 GitHub 授权，完成后 Core 再把访客送回当前页面的评论区。
export async function signInWithGitHub(apiUrl: string) {
  const page = new URL(location.href);
  page.hash = "comments";
  const callbackURL = page.href;
  page.searchParams.set("github_login", "failed");
  const errorCallbackURL = page.href;
  const response = await fetch(`${apiUrl}/auth/sign-in/social`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "github", callbackURL, errorCallbackURL, disableRedirect: true }),
  });
  const result = await response.json().catch(() => null) as { url?: string; message?: string } | null;
  if (!response.ok || !result?.url?.startsWith("https://github.com/")) throw new Error(result?.message || "登录跳转失败");
  location.assign(result.url);
}

export async function signOut(apiUrl: string) {
  await fetch(`${apiUrl}/auth/sign-out`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
  set({ status: "guest" });
}
