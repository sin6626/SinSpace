"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { CircleUserRound, LoaderCircle, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { create } from "zustand";
import { useIsland } from "../lib/island-store";
import { useT } from "./locale-provider";
import { providerNames, signIn, signOut, useLoginError, useReaderSession, type LoginProvider, type Reader } from "./reader-session";
import "./account-menu.css";

type Provider = { id: LoginProvider; icon: ReactNode };
type Site = { name: string; avatar?: string };

// 全站只有一个登录弹窗（由页头那份 AccountMenu 挂载），页头和评论区都从这里打开；
// hash 记下登录后回到哪里（评论区传 "comments"，回到文末评论区）。
const useLoginDialog = create<{ open: boolean; hash?: string; show: (hash?: string) => void; hide: () => void }>()((set) => ({
  open: false,
  show: (hash) => set({ open: true, hash }),
  hide: () => set({ open: false }),
}));
export const openLoginDialog = (hash?: string) => useLoginDialog.getState().show(hash);

// 页头（和手机菜单底部）的读者登录入口，与评论区共用同一份登录状态（reader-session.ts）。
// 没登录：人像图标，点开居中的登录弹窗；登录后：头像右下角一枚登录来源角标，点开是账号菜单（名字、@用户名、来源、退出）。
// host：页头那份负责挂载登录弹窗、播报从页头发起的登录失败；手机菜单里那份只放按钮。
export default function AccountMenu({ apiUrl, providers, site, host = false, side = "bottom" }: {
  apiUrl: string;
  providers: Provider[];
  site: Site;
  host?: boolean;
  side?: "bottom" | "top";
}) {
  const t = useT().account;
  const session = useReaderSession(apiUrl);
  const loginError = useLoginError("header");
  const push = useIsland((state) => state.push);

  useEffect(() => {
    if (host && loginError) push({ icon: "info", title: t.loginFailed, detail: loginError, duration: 6000 });
  }, [host, loginError, push, t.loginFailed]);

  const reader = session.status === "reader" ? session.reader : null;
  const dialog = host && <LoginDialog apiUrl={apiUrl} providers={providers} site={site} error={loginError} />;
  if (session.status === "loading") return <><span className="account-trigger" aria-hidden="true" />{dialog}</>;
  if (!reader) {
    if (!providers.length) return dialog;
    return (
      <>
        <button type="button" className="icon-button account-trigger" onClick={() => openLoginDialog()} aria-label={t.login} title={t.login}>
          <CircleUserRound size={19} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {dialog}
      </>
    );
  }
  return <>{<AccountDropdown apiUrl={apiUrl} reader={reader} providers={providers} host={host} side={side} />}{dialog}</>;
}

// 头像：图片或名字首字；右下角一枚圆形角标显示这次用哪种第三方登录
function Avatar({ reader, providers, large = false }: { reader: Reader; providers: Provider[]; large?: boolean }) {
  const source = providers.find((provider) => provider.id === reader.provider);
  return (
    <span className="account-avatar" data-large={large ? "" : undefined}>
      {reader.image
        // eslint-disable-next-line @next/next/no-img-element -- GitHub / Google 头像，不走 next/image 白名单
        ? <img src={reader.image} alt="" width={large ? 40 : 30} height={large ? 40 : 30} />
        : <span className="account-initial" aria-hidden="true">{reader.name.slice(0, 1)}</span>}
      {source && <span className="account-badge" aria-hidden="true">{source.icon}</span>}
    </span>
  );
}

function AccountDropdown({ apiUrl, reader, providers, host, side }: { apiUrl: string; reader: Reader; providers: Provider[]; host: boolean; side: "bottom" | "top" }) {
  const t = useT().account;
  const router = useRouter();
  const setNavOpen = useIsland((state) => state.setNavOpen);
  const source = reader.provider === "github" || reader.provider === "google" ? providerNames[reader.provider] : null;
  const sourceIcon = providers.find((provider) => provider.id === reader.provider)?.icon;

  async function logout() {
    await signOut(apiUrl).catch(() => {});
    router.refresh();
  }

  return (
    // 菜单开着时页头夜航岛保持展开，否则鼠标移进菜单时岛会收起、菜单失去依附
    <Menu.Root onOpenChange={(open) => { if (host) setNavOpen(open); }}>
      <Menu.Trigger className="account-trigger account-trigger-avatar" aria-label={t.accountOf(reader.name)} title={reader.name}>
        <Avatar reader={reader} providers={providers} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="account-positioner" side={side} align="end" sideOffset={10} collisionPadding={12}>
          <Menu.Popup className="account-menu">
            <Menu.Group>
              <Menu.GroupLabel className="account-label">{t.account}</Menu.GroupLabel>
              <div className="account-profile">
                <Avatar reader={reader} providers={providers} large />
                <div className="account-names">
                  <strong>{reader.name}</strong>
                  <span>{reader.handle ? `@${reader.handle}` : reader.email}</span>
                </div>
              </div>
              <p className="account-meta">
                {sourceIcon && <span className="account-meta-icon" aria-hidden="true">{sourceIcon}</span>}
                {source ? t.via(source) : t.signedIn}
                <span className="account-role">{reader.isOwner ? t.owner : t.reader}</span>
              </p>
            </Menu.Group>
            <Menu.Separator className="account-separator" />
            <Menu.Item className="account-item" onClick={() => void logout()}>
              <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
              {t.logout}
            </Menu.Item>
            {reader.isOwner && <p className="account-note">{t.ownerNote}</p>}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

// 居中的登录弹窗：站长头像带一圈月光，下面“登录到 站名”，一排圆形的彩色品牌按钮（点了显示转圈，等待跳去授权页）
function LoginDialog({ apiUrl, providers, site, error }: { apiUrl: string; providers: Provider[]; site: Site; error: string | null }) {
  const t = useT().account;
  const { open, hash, hide } = useLoginDialog();
  const [pending, setPending] = useState<LoginProvider | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const message = failure ?? error;

  async function login(provider: LoginProvider) {
    setPending(provider);
    setFailure(null);
    try {
      await signIn(apiUrl, provider, hash);
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : t.redirectFailed);
      setPending(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) hide(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="login-backdrop" />
        <Dialog.Popup className="login-dialog">
          {site.avatar && (
            // eslint-disable-next-line @next/next/no-img-element -- 站长头像来自后台任意地址
            <img className="login-avatar" src={site.avatar} alt="" width={64} height={64} />
          )}
          <Dialog.Title className="login-title">{t.loginTo} <strong>{site.name}</strong></Dialog.Title>
          <Dialog.Description className="login-hint">{t.loginHint}</Dialog.Description>
          <ul className="login-providers">
            {providers.map(({ id, icon }) => (
              <li key={id}>
                <button type="button" className="login-provider" onClick={() => void login(id)} disabled={pending !== null} aria-label={t.useProvider(providerNames[id])}>
                  <span className="login-provider-icon">
                    {pending === id ? <LoaderCircle className="login-spinner" size={20} strokeWidth={2} aria-hidden="true" /> : icon}
                  </span>
                  <span className="login-provider-name">{providerNames[id]}</span>
                </button>
              </li>
            ))}
          </ul>
          {message && <p className="login-error" role="alert">{message}</p>}
          <Dialog.Close className="login-close" aria-label={t.close}>
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
