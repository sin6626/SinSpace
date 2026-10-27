import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getOwner } from "../lib/blog-data";

// 阳台场景下面的自我介绍：头像、打招呼、后台“个人介绍”，以及“关于我”和社交账号。读取失败时整块不显示。
export default async function HomeIntro() {
  let owner: Awaited<ReturnType<typeof getOwner>>;
  try {
    owner = await getOwner();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
  return (
    <section className="home-intro" aria-label="关于我">
      {owner.avatar && (
        // eslint-disable-next-line @next/next/no-img-element -- 头像来自后台任意地址，不走 Next 图片优化
        <img className="home-intro-avatar" src={owner.avatar} alt="" width={72} height={72} />
      )}
      <div>
        <p className="home-intro-name">你好，我是 {owner.name}</p>
        {owner.introduce && <p className="home-intro-text">{owner.introduce}</p>}
        <div className="home-intro-links">
          {owner.aboutHref && <Link href={owner.aboutHref}>更多关于我 →</Link>}
          {owner.socials.map((social) => (
            <a key={social.href} href={social.href} target="_blank" rel="noopener noreferrer">{social.label} ↗</a>
          ))}
        </div>
      </div>
    </section>
  );
}
