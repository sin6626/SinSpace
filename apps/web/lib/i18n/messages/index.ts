import type { Locale } from "../config";
import en from "./en";
import ja from "./ja";
import zh, { type Messages } from "./zh";

// 三种语言的文案都打进同一份代码（合计几十 KB，压缩后更小），客户端组件按当前语言直接取，不用另外加载
export const messages: Record<Locale, Messages> = { zh, en, ja };
export type { Messages };
