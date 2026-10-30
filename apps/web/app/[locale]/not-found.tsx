import type { Metadata } from "next";
import LocaleLink from "@/components/locale-provider";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).notFound.title };
}

// 地址不存在、或详情页调用 notFound() 时显示，保留站点导航。
export default async function NotFound() {
  const t = (await getT()).notFound;
  return (
    <section className="empty-state" aria-labelledby="not-found-heading">
      <p className="empty-state-code" aria-hidden="true">404</p>
      <h1 id="not-found-heading">{t.heading}</h1>
      <p>{t.body}</p>
      <div className="empty-state-actions">
        <LocaleLink className="btn btn-primary" href="/">{t.home}</LocaleLink>
        <LocaleLink className="btn" href="/posts">{t.posts}</LocaleLink>
      </div>
    </section>
  );
}
