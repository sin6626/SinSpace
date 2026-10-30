import { Sparkles } from "lucide-react";
import Link from "./locale-provider";
import { getArticleAi, getArticleTranslation, isTranslationLanguage, translationLanguages, type TranslationLanguage } from "../lib/blog-data";

// 文章、手记详情的 AI 摘要与翻译。?lang=en / ?lang=ja 切换到后台已生成的翻译；没有对应翻译时退回原文。
export async function loadArticleAi(id: string, rawLang: unknown) {
  const lang = isTranslationLanguage(rawLang) ? rawLang : null;
  const [ai, translation] = await Promise.all([
    getArticleAi(id, lang ?? "zh").catch(() => ({ summary: null, languages: [] as TranslationLanguage[] })),
    lang ? getArticleTranslation(id, lang).catch(() => null) : null,
  ]);
  return { ...ai, lang: translation ? lang : null, translation };
}

type Loaded = Awaited<ReturnType<typeof loadArticleAi>>;

export function ArticleLanguages({ href, ai }: { href: string; ai: Loaded }) {
  if (!ai.languages.length) return null;
  return (
    <nav className="article-languages" aria-label="阅读语言">
      <Link href={href} aria-current={ai.lang ? undefined : "page"}>原文</Link>
      {ai.languages.map((lang) => (
        <Link key={lang} href={`${href}?lang=${lang}`} hrefLang={lang} aria-current={ai.lang === lang ? "page" : undefined}>{translationLanguages[lang]}</Link>
      ))}
    </nav>
  );
}

export function ArticleAiNotes({ ai }: { ai: Loaded }) {
  return (
    <>
      {ai.translation && (
        <p className="ai-note" role="note">
          以下内容由 AI 从中文翻译{ai.translation.aiModel ? `（${ai.translation.aiModel}）` : ""}，可能与原文有出入。
        </p>
      )}
      {ai.summary && (
        <aside className="ai-summary" aria-label="AI 摘要" lang={ai.lang ?? undefined}>
          <p className="ai-summary-label"><Sparkles size={14} aria-hidden="true" />AI 摘要</p>
          <p>{ai.summary}</p>
        </aside>
      )}
    </>
  );
}
