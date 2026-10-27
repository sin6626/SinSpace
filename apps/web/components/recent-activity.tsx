import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getRecentActivity, type RecentActivity } from "../lib/blog-data";
import { formatDate } from "../lib/date";

// 首页右栏“最近发生的事”（同 Shiro 的 ActivityRecent）：一条竖线串起来的时间线，
// 每条前面一个小圆图标，评论和碎碎念的正文放在气泡里。
const icons: Record<RecentActivity["kind"], React.ReactNode> = {
  comment: <path d="M4 5.5h16v10.5H9l-5 4z" />,
  like: <path d="M12 19.5s-7-4.4-7-10a4 4 0 0 1 7-2.6 4 4 0 0 1 7 2.6c0 5.6-7 10-7 10Z" />,
  post: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 8.5h6M9 12h6M9 15.5h4" /></>,
  note: <path d="M5 19l1-4L16.5 4.5l3 3L9 18z M14 7l3 3" />,
  recent: <path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-4 10.4c.7.7 1.1 1.5 1.1 2.6h5.8c0-1.1.4-1.9 1.1-2.6A6 6 0 0 0 12 3Z" />,
};

function Title({ item }: { item: RecentActivity }) {
  const title = <b>{item.title}</b>;
  return item.href ? <Link className="activity-link" href={item.href}>{title}</Link> : title;
}

function Body({ item }: { item: RecentActivity }) {
  switch (item.kind) {
    case "comment":
      return (
        <>
          <p className="activity-line">
            {item.avatar && (
              // eslint-disable-next-line @next/next/no-img-element -- 评论者头像来自 Gravatar 或第三方登录
              <img className="activity-avatar" src={item.avatar} alt="" width={18} height={18} loading="lazy" />
            )}
            <span className="activity-author">{item.author}</span>
            <small>在</small>
            {item.title ? <Title item={item} /> : <small>一处</small>}
            <small>说：</small>
          </p>
          {item.text && <p className="activity-bubble">{item.text}</p>}
        </>
      );
    case "recent":
      return (
        <>
          <p className="activity-line"><small>写了一条</small><Link className="activity-link" href="/thinking"><b>碎碎念</b></Link></p>
          {item.text && <p className="activity-bubble">{item.text}</p>}
        </>
      );
    case "like":
      return <p className="activity-line"><small>有人点赞了</small><Title item={item} /></p>;
    default:
      return <p className="activity-line"><small>发布了</small><Title item={item} /></p>;
  }
}

export default async function RecentActivityList() {
  let items: RecentActivity[];
  try {
    items = await getRecentActivity();
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-empty" role="alert">最近的动态读取失败，请稍后刷新。</p>;
  }
  if (!items.length) return <p className="post-empty">这里还很安静。</p>;
  return (
    <ul className="activity-timeline">
      {items.map((item) => (
        <li key={item.key} className="activity-item" data-kind={item.kind}>
          <span className="activity-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">{icons[item.kind]}</svg>
          </span>
          <div className="activity-body">
            <Body item={item} />
            <time dateTime={item.created}>{formatDate(item.created)}</time>
          </div>
        </li>
      ))}
    </ul>
  );
}
