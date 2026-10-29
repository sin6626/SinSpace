import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings, getSubscribeOptions, siteName } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import ArticleActions from "./article-actions";
import ArticleToc from "./article-toc";
import CommentChat from "./comment-chat";
import type { CommentRefType } from "./comment-form";
import IconifyIcon from "./iconify-icon";

type Props = {
  title: string;
  like?: { id: string; type: "post" | "note"; count: number };
  comments: { refId: string; refType: CommentRefType; allowComment: boolean };
};

// 文章/手记/页面详情右侧的悬浮栏：上面是目录，下面是操作（喜欢、评论悬浮窗、分享、订阅、回到顶部）。
// 宽屏悬浮在正文右侧留白里，窄屏整栏隐藏（globals.css 的 .site-details、article-toc.css）；页面（关于我等）没有点赞。
export default function ArticleAside({ title, like, comments }: Props) {
  return (
    <aside className="site-details" aria-label="文章目录与操作">
      <ArticleToc />
      <Suspense fallback={null}>
        <Actions title={title} like={like} comments={comments} />
      </Suspense>
    </aside>
  );
}

// 订阅开关和站名读不到时，订阅按钮不显示，其余照常
async function Actions({ title, like, comments }: Props) {
  const apiUrl = getApiUrl();
  let loaded: [Awaited<ReturnType<typeof getSubscribeOptions>>, Awaited<ReturnType<typeof getSiteSettings>> | null] | null = null;
  try {
    loaded = await Promise.all([getSubscribeOptions(), getSiteSettings().catch(() => null)]);
  } catch (error) {
    unstable_rethrow(error);
  }
  const [options, settings] = loaded ?? [null, null];
  const subscribe = options?.enabled
    ? { apiUrl, siteName: settings?.name ?? siteName, types: options.types, mailIcon: <IconifyIcon icon="mingcute:mail-send-fill" size={20} /> }
    : null;
  return <ArticleActions title={title} like={like ? { apiUrl, ...like } : null} comments={<CommentChat {...comments} title={title} />} subscribe={subscribe} />;
}
