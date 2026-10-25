"use server";

import { getApiClient } from "../lib/api";
import ArticleBody from "./article-body";

function httpStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
}

// 加密手记：访客在页面里输入密码，服务端带密码向 Core 读取并直接渲染正文返回。
// 结果按访客的密码各不相同，不能进 "use cache"；密码只在本次请求里使用，不落日志、不写进地址栏。
export async function unlockNote(nid: number, password: string) {
  if (!Number.isSafeInteger(nid) || nid < 1 || !password || password.length > 100) {
    return { ok: false as const, message: "请输入密码。" };
  }
  try {
    const note = await getApiClient().note.getNoteById(nid, password, true);
    return {
      ok: true as const,
      body: <ArticleBody text={note.text} contentFormat={note.contentFormat} content={note.contentFormat === "lexical" ? note.content : undefined} emptyText="这篇手记暂时没有可展示的正文。" />,
    };
  } catch (error) {
    // Core 对密码错误和未提供密码都返回 403。
    if (httpStatus(error) === 403) return { ok: false as const, message: "密码不正确。" };
    return { ok: false as const, message: "读取失败，请稍后重试。" };
  }
}
