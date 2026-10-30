"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, use, type ComponentProps } from "react";
import { defaultLocale, localizeHref, splitLocale, type Locale } from "../lib/i18n/config";
import { messages } from "../lib/i18n/messages";

// 客户端组件拿当前语言：根布局用 LocaleProvider 把 [locale] 放进 context
const LocaleContext = createContext<Locale>(defaultLocale);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export const useLocale = () => use(LocaleContext);
export const useT = () => messages[useLocale()];

// 去掉语言前缀的当前路径（/en/posts → /posts），判断当前页、拼地址都用它
export function useLocalePathname() {
  return splitLocale(usePathname()).path;
}

// 站内链接：自动加上当前语言的前缀（中文不加），用法与 next/link 相同
export default function LocaleLink({ href, ...props }: ComponentProps<typeof Link>) {
  const locale = useLocale();
  return <Link href={typeof href === "string" ? localizeHref(href, locale) : href} {...props} />;
}
