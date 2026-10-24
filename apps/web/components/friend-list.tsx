import { LinkState, LinkType } from "@mx-space/api-client";
import { unstable_rethrow } from "next/navigation";
import { getLinks } from "../lib/blog-data";
import { safeUrl } from "../lib/safe-url";

type Link = Awaited<ReturnType<typeof getLinks>>[number];

// 分组沿用 Shiro：隐藏的不显示；已通过的按类型分“朋友”“收藏”；失联的只列名字（不可访问，不给链接）；
// 被封禁的不展示。友链申请表单暂未做。
function LinkCards({ links }: { links: Link[] }) {
  return (
    <ul className="post-list">
      {links.map((link) => {
        const url = safeUrl(link.url);
        const avatar = safeUrl(link.avatar);
        return (
          <li key={link.id} className="project-item">
            {/* eslint-disable-next-line @next/next/no-img-element -- 友链头像来自任意域名，不走 next/image 白名单 */}
            {avatar && <img className="project-avatar" src={avatar} alt="" width={48} height={48} loading="lazy" />}
            <article>
              <h3>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{link.name}</a> : link.name}</h3>
              {link.description && <p className="post-summary">{link.description}</p>}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export default async function FriendList() {
  let links: Link[];
  try {
    links = await getLinks();
  } catch (error) {
    unstable_rethrow(error);
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- 重试用整页加载，确保重新请求
    return <p className="post-list-content" role="alert">友链读取失败。<a href="/friends">重试</a></p>;
  }
  const visible = links.filter((link) => !link.hide);
  const passed = visible.filter((link) => link.state === LinkState.Pass);
  const friends = passed.filter((link) => link.type === LinkType.Friend);
  const collections = passed.filter((link) => link.type === LinkType.Collection);
  const outdated = visible.filter((link) => link.state === LinkState.Outdate);

  return (
    <>
      <header className="page-heading">
        <h1>友链</h1>
        <p className="post-meta">海内存知己，天涯若比邻</p>
      </header>
      <div className="post-list-content">
        {!friends.length && !collections.length && !outdated.length && <p className="post-empty">还没有友链。</p>}
        {friends.length > 0 && (
          <section aria-labelledby="friends-heading">
            <h2 id="friends-heading">我的朋友</h2>
            <LinkCards links={friends} />
          </section>
        )}
        {collections.length > 0 && (
          <section aria-labelledby="collections-heading">
            <h2 id="collections-heading">我的收藏</h2>
            <LinkCards links={collections} />
          </section>
        )}
        {outdated.length > 0 && (
          <details>
            <summary>以下站点无法访问，已失联</summary>
            <ul>{outdated.map((link) => <li key={link.id}>{link.name}</li>)}</ul>
          </details>
        )}
      </div>
    </>
  );
}
