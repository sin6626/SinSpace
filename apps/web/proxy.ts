import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, localeCookie, pickLocale, splitLocale } from "./lib/i18n/config";

// 站点语言的入口（2026-10-30，参照 Shiro）：页面都在 app/[locale] 下。
// - /en/…、/ja/… 原样放行；/zh/… 跳到不带前缀的地址（中文只有一个地址）。
// - 不带前缀的地址：读者手动选过语言（Cookie NEXT_LOCALE）就听他的，没选过看浏览器首选语言（Accept-Language）；
//   是英文、日文就跳到带前缀的地址，否则在内部改写成 /zh/…，地址栏不变。
// 规则检查：scripts/verify-i18n.mjs（纯函数）、scripts/e2e/i18n.mjs（真实请求）。
// 静态文件（public 里的图片、feed.xml、robots.txt、sitemap.xml 等）不处理；只看最后一段的扩展名，文章 slug 里带点（如 v1.2）照常处理
const staticFile = /\.(?:ico|png|jpe?g|gif|webp|avif|svg|txt|xml|json|webmanifest|js|css|map|woff2?)$/i;

// 内部改写成 /zh/… 时加在请求上的标记
const rewriteMark = "x-locale-rewrite";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (staticFile.test(pathname)) return NextResponse.next();
  const { locale, path } = splitLocale(pathname);
  // 中文只有不带前缀的地址：外面直接访问 /zh/… 时跳回去。下面改写成 /zh/… 的请求会再经过这里一次，带着标记，放行
  if (locale === defaultLocale) {
    return request.headers.get(rewriteMark) ? NextResponse.next() : NextResponse.redirect(new URL(`${path}${search}`, request.url), 308);
  }
  if (locale) return NextResponse.next();
  // 旧的文章翻译链接 ?lang=en / ?lang=ja（站点语言出来之前用的）跳到对应语言的地址
  const legacy = request.nextUrl.searchParams.get("lang");
  if (isLocale(legacy) && legacy !== defaultLocale) {
    const target = new URL(`/${legacy}${pathname === "/" ? "" : pathname}`, request.url);
    request.nextUrl.searchParams.forEach((value, key) => key !== "lang" && target.searchParams.append(key, value));
    return NextResponse.redirect(target, 308);
  }

  const chosen = request.cookies.get(localeCookie)?.value;
  const preferred = isLocale(chosen) ? chosen : pickLocale(request.headers.get("accept-language")) ?? defaultLocale;
  if (preferred !== defaultLocale) {
    const response = NextResponse.redirect(new URL(`/${preferred}${pathname === "/" ? "" : pathname}${search}`, request.url), 307);
    response.headers.set("Vary", "Accept-Language, Cookie");
    return response;
  }
  const headers = new Headers(request.headers);
  headers.set(rewriteMark, "1");
  const response = NextResponse.rewrite(new URL(`/${defaultLocale}${pathname === "/" ? "" : pathname}${search}`, request.url), { request: { headers } });
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

// 接口和 Next 自己的资源不经过这里
export const config = {
  matcher: ["/((?!api|_next).*)"],
};
