"use client";

import { useSyncExternalStore } from "react";

// 读者登录状态（Core 的 Better Auth 会话）。每个访客各不相同，只能在浏览器里读，不能进服务端缓存。
// 登录 Cookie 由 Core 下发且 HttpOnly，所有请求都要 credentials: "include" 才会带上。
export type Reader = { name: string; image?: string; isOwner: boolean };
type State = { status: "loading" } | { status: "guest" } | { status: "reader"; reader: Reader };

const loadingState: State = { status: "loading" };
let state: State = loadingState;
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
    // 服务端快照必须恒为“读取中”：页面里有好几处用到登录状态（页头、文末评论、评论悬浮窗），分在不同的 Suspense 里先后水合，
    // 若返回当前状态，后水合的那处拿到的是已读到的“游客/读者”，和服务端输出的“读取中”对不上，报 Hydration failed
    () => loadingState,
  );
}

// 读者登录方式：后台“设置 → 账户 → OAuth”里启用并填好密钥的才会出现（blog-data 的 getLoginProviders）。
export type LoginProvider = "github" | "google";
export const providerNames: Record<LoginProvider, string> = { github: "GitHub", google: "Google" };
// 授权页只放行官方地址，防止 Core 返回的跳转地址被篡改
const providerOrigins: Record<LoginProvider, string> = { github: "https://github.com/", google: "https://accounts.google.com/" };
const loginParams = ["login", "login_provider", "error", "error_description"];

// 登录失败时 Core（Better Auth）默认跳到它自己的英文错误页，页上的“返回首页”会把人带到 Core 根地址。
// 这里让失败也回到发起登录的页面：地址带 login=failed&login_provider=…，Better Auth 再追加 error=错误码。
const loginErrorMessages: Record<string, (name: string) => string> = {
  state_mismatch: () => "登录校验没通过：浏览器没有带上登录用的 Cookie。请确认博客和 Core 用同一个主机打开（本地统一用 127.0.0.1，不要用 localhost），并且浏览器没有拦截本站 Cookie。",
  access_denied: (name) => `你取消了 ${name} 授权。`,
  invalid_code: (name) => `${name} 授权码无效或已过期，请重新登录。`,
  account_not_linked: (name) => `这个 ${name} 账号的邮箱已被其他账号使用，没能自动关联。`,
  unable_to_get_user_info: (name) => `没能从 ${name} 读取到你的资料，请确认授权时允许读取邮箱。`,
};
// source：从评论区发起（回跳地址带 #comments）的错误显示在评论表单里，从页头发起的由夜航岛播报
type LoginError = { message: string; source: "comments" | "header" };
let loginError: LoginError | null | undefined;
const noSubscribe = () => () => {};

function readLoginError() {
  if (loginError !== undefined) return loginError;
  const url = new URL(location.href);
  if (url.searchParams.get("login") !== "failed") return (loginError = null);
  const code = url.searchParams.get("error") || "unknown";
  const provider = url.searchParams.get("login_provider");
  const name = provider === "github" || provider === "google" ? providerNames[provider] : "第三方";
  loginError = {
    message: `${loginErrorMessages[code]?.(name) ?? `${name} 登录失败，请稍后重试。`}（错误码 ${code}）`,
    source: url.hash === "#comments" ? "comments" : "header",
  };
  for (const key of loginParams) url.searchParams.delete(key);
  // 只提示一次：把参数从地址栏去掉，刷新后不再出现（带上 history.state，否则 Next 会当成路由更新）。
  queueMicrotask(() => history.replaceState(history.state, "", url));
  return loginError;
}

export function useLoginError(source: LoginError["source"]) {
  const error = useSyncExternalStore(noSubscribe, readLoginError, () => null);
  return error?.source === source ? error.message : null;
}

// 跳到第三方授权页，完成后 Core 再把访客送回发起登录的页面（hash 给 "comments" 时回到评论区）。
export async function signIn(apiUrl: string, provider: LoginProvider, hash?: string) {
  const page = new URL(location.href);
  for (const key of loginParams) page.searchParams.delete(key);
  if (hash !== undefined) page.hash = hash;
  const callbackURL = page.href;
  page.searchParams.set("login", "failed");
  page.searchParams.set("login_provider", provider);
  const errorCallbackURL = page.href;
  const response = await fetch(`${apiUrl}/auth/sign-in/social`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, callbackURL, errorCallbackURL, disableRedirect: true }),
  });
  const result = await response.json().catch(() => null) as { url?: string; message?: string } | null;
  if (!response.ok || !result?.url?.startsWith(providerOrigins[provider])) throw new Error(result?.message || "登录跳转失败");
  location.assign(result.url);
}

export async function signOut(apiUrl: string) {
  await fetch(`${apiUrl}/auth/sign-out`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
  set({ status: "guest" });
}
