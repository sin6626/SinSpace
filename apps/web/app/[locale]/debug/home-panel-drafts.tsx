import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/locale-provider";
import { SocialIcon } from "@/components/iconify-icon";
import { getNavigationData, getNavigationPanels, getOwner } from "@/lib/blog-data";
import "./home-panel-drafts.css";

// 导航“首页”悬停面板的两个候选排版（2026-10-31 与用户讨论，原来的“此间三个数字 + 页面网格”和 Innei 撞了）。
// 只在调试页展示，数据是真实的（第几夜 = 建站天数、篇数、字数、后台页面、社交账号）；页面下面那句说明暂时写在这里，定稿后再决定放哪。
const pageNotes: Record<string, string> = { about: "这里的主人", "about-site": "这个站怎么来的" };

function words(count: number) {
  return count >= 10000 ? `${(count / 10000).toFixed(1)} 万字` : `${count} 字`;
}

type Data = {
  nights: number | null;
  writings: number;
  words: number;
  pages: { title: string; href: string; note: string }[];
  socials: { href: string; label: string; icon: string; color: string; dark?: boolean }[];
};

function Socials({ socials }: { socials: Data["socials"] }) {
  return (
    <ul className="nav-socials draft-socials">
      {socials.map((social) => (
        <li key={social.href} data-dark={social.dark ? "" : undefined} style={{ "--brand": social.color } as CSSProperties}>
          <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
            <SocialIcon icon={social.icon} label={social.label} size={15} />
          </a>
        </li>
      ))}
    </ul>
  );
}

// 方案一：上中下三段。上面“第 N 夜”和一行小字，中间两张页面卡片，底下社交账号。
function Stacked({ data }: { data: Data }) {
  return (
    <div className="draft-popup draft-stacked">
      <div className="draft-stacked-head">
        <p className="draft-night">第 <b>{data.nights}</b> 夜</p>
        <p className="draft-small">写了 {data.writings} 篇，{words(data.words)}</p>
      </div>
      <ul className="draft-stacked-pages">
        {data.pages.map((page) => (
          <li key={page.href}>
            <Link className="draft-page" href={page.href}>
              <span className="draft-page-title">{page.title}</span>
              <span className="draft-small">{page.note}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div><Socials socials={data.socials} /></div>
    </div>
  );
}

// 方案 C：海报大字。左边一个压住整栏的细体大数字和竖排的“夜”，篇数、字数是下面的注脚；右边页面一行一个，带说明和箭头，社交账号在右下。
function Poster({ data }: { data: Data }) {
  return (
    <div className="draft-popup draft-poster">
      <div className="draft-poster-side">
        <p className="draft-poster-night">
          <b>{data.nights}</b>
          <span>夜</span>
        </p>
        <p className="draft-small draft-poster-foot">
          <span>{data.writings} 篇</span>
          <span>{words(data.words)}</span>
        </p>
      </div>
      <div className="draft-poster-main">
        <ul className="draft-poster-pages">
          {data.pages.map((page) => (
            <li key={page.href}>
              <Link className="draft-page draft-poster-page" href={page.href}>
                <span>
                  <span className="draft-page-title">{page.title}</span>
                  <span className="draft-small">{page.note}</span>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <Socials socials={data.socials} />
      </div>
    </div>
  );
}

export default async function HomePanelDrafts() {
  const [navigation, panels, owner] = await Promise.all([getNavigationData(), getNavigationPanels().catch(() => null), getOwner().catch(() => null)]);
  const data: Data = {
    nights: panels?.stats.days ?? null,
    writings: panels?.stats.writings ?? 0,
    words: panels?.stats.words ?? 0,
    pages: navigation.pageMeta.map((page) => ({ title: page.title, href: `/${encodeURIComponent(page.slug)}`, note: pageNotes[page.slug] ?? "" })),
    socials: owner?.socials ?? [],
  };
  return (
    <div className="draft-panels">
      <figure>
        <figcaption className="post-meta">方案一 · 三段</figcaption>
        <Stacked data={data} />
      </figure>
      <figure>
        <figcaption className="post-meta">方案 C · 海报大字</figcaption>
        <Poster data={data} />
      </figure>
    </div>
  );
}
