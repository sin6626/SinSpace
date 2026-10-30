import "server-only";
import { locale as rootLocale } from "next/root-params";
import { defaultLocale, isLocale, type Locale } from "./config";
import { messages } from "./messages";

// 服务端组件（包括 "use cache" 函数外层）读当前语言：取根路由参数 [locale]（Next 的 next/root-params，不用层层传 props）
export async function getLocale(): Promise<Locale> {
  const value = await rootLocale();
  return isLocale(value) ? value : defaultLocale;
}

// 当前语言的文案（messages/zh.ts 是原文，en.ts、ja.ts 结构必须一致）
export async function getT() {
  return messages[await getLocale()];
}
