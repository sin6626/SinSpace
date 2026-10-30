import { notFound, unstable_rethrow } from "next/navigation";
import { getNotesByTopic, getTopics, searchNotes } from "../lib/blog-data";
import type { ReactNode } from "react";
import ResultList from "./result-list";
import { getLocale, getT } from "../lib/i18n/server";

type Note = { id: string; nid: number; title: string; created: string };
const toItems = (notes: Note[]) => notes.map((note) => ({ key: note.id, href: `/notes/${note.nid}`, title: note.title, created: note.created }));

export async function NoteSearch({ keyword, search, filters }: { keyword: string; search: ReactNode; filters: ReactNode }) {
  let result: Awaited<ReturnType<typeof searchNotes>> | null = null;
  try {
    result = await searchNotes(keyword, await getLocale());
  } catch (error) {
    unstable_rethrow(error);
  }
  const { notes: t, list } = await getT();
  const summary = result ? list.searchSummary(keyword, result.total, result.data.length) : list.searchQuery(keyword);
  return <ResultList title={t.search} summary={summary} items={result && toItems(result.data)} emptyText={t.searchEmpty} search={search} filters={filters} />;
}

export async function NotesByTopic({ slug, search, filters }: { slug: string; search: ReactNode; filters: ReactNode }) {
  let topics: Awaited<ReturnType<typeof getTopics>> | null = null;
  try {
    topics = await getTopics(await getLocale());
  } catch (error) {
    unstable_rethrow(error);
  }
  const topic = topics?.find((item) => item.slug === slug);
  // 话题列表读到了但没有这个话题（或它下面没有公开手记）才是 404；读取失败显示错误提示。
  if (topics && !topic) notFound();
  let result: Awaited<ReturnType<typeof getNotesByTopic>> | null = null;
  if (topic) {
    try {
      result = await getNotesByTopic(topic.id, await getLocale());
    } catch (error) {
      unstable_rethrow(error);
    }
  }
  const { notes: t, list } = await getT();
  return <ResultList title={topic ? t.topic(topic.name) : t.topics} summary={result ? list.total(result.total) : ""} items={result && toItems(result.data)} emptyText={t.topicEmpty} search={search} filters={filters} />;
}
