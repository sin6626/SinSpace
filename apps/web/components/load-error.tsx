import { getT, localize } from "../lib/i18n/server";

// 列表、详情读取失败：一句提示 + “重试”。重试用普通 <a> 整页加载，确保重新请求。
export default async function LoadError({ what, href }: { what: string; href: string }) {
  const [{ list }, retry] = await Promise.all([getT(), localize(href)]);
  return <p className="post-list-content" role="alert">{list.failed(what)}<a href={retry}>{list.retry}</a></p>;
}
