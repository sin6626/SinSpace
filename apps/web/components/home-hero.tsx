import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { getOwner } from "../lib/blog-data";
import Starfield from "./starfield";
import "./home-hero.css";

// 首页第一屏：WebGL 夜空做背景，左边一段话，右边大头像。文字先写死，头像读后台个人资料。
async function Portrait() {
  let avatar: string | undefined;
  try {
    avatar = (await getOwner()).avatar;
  } catch (error) {
    unstable_rethrow(error);
  }
  return avatar ? (
    // eslint-disable-next-line @next/next/no-img-element -- 头像来自后台任意地址，不走 Next 图片优化
    <img className="home-hero-avatar" src={avatar} alt="Sin 的头像" width={352} height={352} fetchPriority="high" />
  ) : <span className="home-hero-avatar is-empty" aria-hidden="true" />;
}

export default function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <Starfield />
      <div className="home-hero-inner">
        <div className="home-hero-text">
          <p className="home-hero-eyebrow">夜深了，欢迎来到 Sin’s Space</p>
          <h1 id="home-hero-title">你好，我是 <span>Sin</span></h1>
          <p className="home-hero-lead">一个喜欢在深夜写代码的大二学生。白天上课，晚上折腾前端、写博客、做点小东西。</p>
          <p className="home-hero-lead">这里放着我的作品、文章、写给自己的心里话，还有平日里的碎碎念。</p>
          <div className="home-hero-actions">
            <Link className="btn btn-primary" href="/posts">看看文章</Link>
            <Link className="btn home-hero-secondary" href="/about">关于我</Link>
          </div>
        </div>
        <div className="home-hero-portrait">
          <Suspense fallback={<span className="home-hero-avatar is-empty" aria-hidden="true" />}>
            <Portrait />
          </Suspense>
        </div>
      </div>
      <a className="home-hero-down" href="#home-room" aria-label="往下看看">
        <span aria-hidden="true" />
      </a>
    </section>
  );
}
