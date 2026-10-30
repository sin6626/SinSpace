// 站点语言（2026-10-30）：中文默认、不带前缀（/posts），英文、日文带前缀（/en/posts、/ja/posts）。
// 与后台 AI 翻译支持的语言一致（blog-data.ts 的 translationLanguages）。这个文件不依赖 React/Next，服务端、客户端、proxy 都能用。
export const locales = ["zh", "en", "ja"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";
export const isLocale = (value: unknown): value is Locale => typeof value === "string" && (locales as readonly string[]).includes(value);

// 语言切换菜单里每种语言用它自己的名字写
export const localeNames: Record<Locale, string> = { zh: "中文", en: "English", ja: "日本語" };
export const htmlLang: Record<Locale, string> = { zh: "zh-CN", en: "en", ja: "ja" };
export const ogLocale: Record<Locale, string> = { zh: "zh_CN", en: "en_US", ja: "ja_JP" };

// 读者手动选过语言后记在这个 Cookie 里（proxy.ts 据此决定不带前缀的地址去哪种语言）
export const localeCookie = "NEXT_LOCALE";

// 站内地址加上语言前缀：只处理以 / 开头的站内路径，中文不加；外链、锚点原样返回
export function localizeHref(href: string, locale: Locale) {
  if (locale === defaultLocale || !href.startsWith("/") || href.startsWith("//")) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

// 从地址里拆出语言前缀：/en/posts → { locale: "en", path: "/posts" }，/posts → { locale: null, path: "/posts" }
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const segment = pathname.split("/")[1];
  if (!isLocale(segment)) return { locale: null, path: pathname };
  const rest = pathname.slice(segment.length + 1);
  return { locale: segment, path: rest || "/" };
}

// 从浏览器的 Accept-Language（如 "ja,en-US;q=0.9,en;q=0.8"）里按权重挑出第一个支持的语言
export function pickLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1, index };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}
