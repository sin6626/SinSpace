"use client";

import { Popover } from "@base-ui/react/popover";
import { CircleUserRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useIsland } from "../lib/island-store";
import { providerNames, signIn, signOut, useLoginError, useReaderSession, type LoginProvider } from "./reader-session";
import "./account-menu.css";

// 页头（以及手机菜单底部）的读者登录入口，和评论区共用同一份登录状态（reader-session.ts）。
// 没登录：一个人像图标，点开是各登录方式的按钮；登录后：显示头像，点开是名字、身份和“退出登录”。
// 只在后台启用了至少一种登录方式时出现。从页头登录失败回来时，由夜航岛播报，详情在浮层里。
export default function AccountMenu({ apiUrl, providers, side = "bottom" }: {
  apiUrl: string;
  providers: { id: LoginProvider; icon: ReactNode }[];
  side?: "bottom" | "top";
}) {
  const router = useRouter();
  const session = useReaderSession(apiUrl);
  const loginError = useLoginError("header");
  const setNavOpen = useIsland((state) => state.setNavOpen);
  const push = useIsland((state) => state.push);
  const [pending, setPending] = useState<LoginProvider | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = error ?? loginError;
  // 只让页头那一份播报（手机菜单里的同一组件 side="top"），避免播两遍
  const announce = side === "bottom";

  useEffect(() => {
    if (announce && loginError) push({ icon: "info", title: "登录没有成功", detail: loginError, duration: 6000 });
  }, [announce, loginError, push]);

  async function login(provider: LoginProvider) {
    setPending(provider);
    setError(null);
    try {
      await signIn(apiUrl, provider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录跳转失败");
      setPending(null);
    }
  }

  async function logout() {
    setPending("out");
    await signOut(apiUrl).catch(() => {});
    setPending(null);
    router.refresh();
  }

  if (session.status === "loading") return <span className="account-trigger" aria-hidden="true" />;
  const reader = session.status === "reader" ? session.reader : null;
  if (!reader && !providers.length) return null;

  return (
    // 浮层开着时页头夜航岛保持展开，否则鼠标移进浮层时岛会收起、浮层失去依附
    <Popover.Root onOpenChange={(open) => { if (announce) setNavOpen(open); }}>
      <Popover.Trigger className="icon-button account-trigger" aria-label={reader ? `已登录：${reader.name}` : "登录"} title={reader ? reader.name : "登录"}>
        {reader ? (
          reader.image
            // eslint-disable-next-line @next/next/no-img-element -- GitHub / Google 头像，不走 next/image 白名单
            ? <img className="account-avatar" src={reader.image} alt="" width={28} height={28} />
            : <span className="account-avatar" aria-hidden="true">{reader.name.slice(0, 1)}</span>
        ) : (
          <CircleUserRound size={19} strokeWidth={1.75} aria-hidden="true" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="account-positioner" side={side} align="end" sideOffset={10} collisionPadding={12}>
          <Popover.Popup className="account-popup">
            {reader ? (
              <>
                <div className="account-profile">
                  {reader.image
                    // eslint-disable-next-line @next/next/no-img-element -- 同上
                    ? <img className="account-avatar is-large" src={reader.image} alt="" width={44} height={44} />
                    : <span className="account-avatar is-large" aria-hidden="true">{reader.name.slice(0, 1)}</span>}
                  <div>
                    <Popover.Title className="account-name">{reader.name}</Popover.Title>
                    <span className="account-role">{reader.isOwner ? "博主" : "读者"}</span>
                  </div>
                </div>
                <Popover.Description className="account-hint">
                  {reader.isOwner ? "评论会以博主身份显示。退出后，同一浏览器里的后台也会一起退出。" : "评论会署上你的名字和头像。"}
                </Popover.Description>
                <button type="button" className="btn btn-ghost account-logout" onClick={() => void logout()} disabled={pending === "out"}>
                  <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                  {pending === "out" ? "正在退出…" : "退出登录"}
                </button>
              </>
            ) : (
              <>
                <Popover.Title className="account-title">登录</Popover.Title>
                <Popover.Description className="account-hint">登录后评论会署上你的名字和头像。只读取公开资料和邮箱。</Popover.Description>
                <div className="account-providers">
                  {providers.map(({ id, icon }) => (
                    <button key={id} type="button" className="btn account-provider" onClick={() => void login(id)} disabled={pending !== null}>
                      {icon}
                      {pending === id ? "正在跳转…" : `使用 ${providerNames[id]} 登录`}
                    </button>
                  ))}
                </div>
                {shown && <p className="account-error" role="alert">{shown}</p>}
              </>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
