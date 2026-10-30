"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Languages } from "lucide-react";
import { useEffect } from "react";
import { useIsland } from "../lib/island-store";
import { localeCookie, localeNames, localizeHref, locales, splitLocale, type Locale } from "../lib/i18n/config";
import { messages } from "../lib/i18n/messages";
import { useLocale, useT } from "./locale-provider";
import "./language-menu.css";

// 刚换过语言的标记：整页跳转后由页头那份读出来，在夜航岛上播报一句
const switchedKey = "locale-switched";

// 切换语言：记进 Cookie（proxy.ts 以后对不带前缀的地址都按它走，不再看浏览器语言），
// 再整页打开同一页面的新语言地址（换语言就是换根布局，整页加载最稳）。旧的文章 ?lang= 参数不再需要，顺手去掉。
function switchTo(locale: Locale) {
  document.cookie = `${localeCookie}=${locale}; path=/; max-age=31536000; samesite=lax`;
  const url = new URL(location.href);
  url.searchParams.delete("lang");
  url.pathname = localizeHref(splitLocale(url.pathname).path, locale);
  try {
    sessionStorage.setItem(switchedKey, locale);
  } catch {}
  location.assign(url);
}

// 页头（和手机菜单底部）的语言切换：“文A”图标按钮，点开是和账号菜单同样式的小浮层，
// 三种语言各写自己的名字和简写，当前语言打勾。host：页头那份负责播报“已切换到 …”。
export default function LanguageMenu({ host = false, side = "bottom" }: { host?: boolean; side?: "bottom" | "top" }) {
  const locale = useLocale();
  const t = useT().locale;
  const setNavOpen = useIsland((state) => state.setNavOpen);
  const push = useIsland((state) => state.push);

  useEffect(() => {
    if (!host) return;
    let switched: string | null = null;
    try {
      switched = sessionStorage.getItem(switchedKey);
      sessionStorage.removeItem(switchedKey);
    } catch {}
    if (switched !== locale) return;
    const copy = messages[locale].locale;
    push({ icon: "info", title: copy.switched(localeNames[locale]), detail: copy.switchedDetail, duration: 3600 });
  }, [host, locale, push]);

  return (
    // 菜单开着时页头夜航岛保持展开，否则鼠标移进菜单时岛会收起、菜单失去依附
    <Menu.Root onOpenChange={(open) => { if (host) setNavOpen(open); }}>
      <Menu.Trigger className="icon-button language-trigger" aria-label={`${t.menuLabel}（${localeNames[locale]}）`} title={localeNames[locale]}>
        <Languages size={18} strokeWidth={1.75} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="language-positioner" side={side} align="end" sideOffset={10} collisionPadding={12}>
          <Menu.Popup className="language-menu">
            <Menu.RadioGroup value={locale} onValueChange={(value) => { if (value !== locale) switchTo(value as Locale); }}>
              <Menu.GroupLabel className="language-label">{t.groupLabel}</Menu.GroupLabel>
              {locales.map((item) => (
                <Menu.RadioItem key={item} value={item} className="language-item" lang={item}>
                  <span className="language-name">{localeNames[item]}</span>
                  <span className="language-code">{item.toUpperCase()}</span>
                  <Menu.RadioItemIndicator className="language-check" keepMounted>
                    <Check size={15} strokeWidth={2} aria-hidden="true" />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
            <p className="language-hint">{t.hint}</p>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
