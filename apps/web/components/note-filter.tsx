import { notFound, unstable_rethrow } from "next/navigation";
import { getNotesByTopic, getTopics, searchNotes } from "../lib/blog-data";
import ResultList from "./result-list";

type Note = { id: string; nid: number; title: string; created: string };
const toItems = (notes: Note[]) => notes.map((note) => ({ key: note.id, href: `/notes/${note.nid}`, title: note.title, created: note.created }));

export async function NoteSearch({ keyword }: { keyword: string }) {
  let result: Awaited<ReturnType<typeof searchNotes>> | null = null;
  try {
    result = await searchNotes(keyword);
  } catch (error) {
    unstable_rethrow(error);
  }
  const summary = result
    ? `搜索“${keyword}”，共 ${result.total} 篇${result.total > result.data.length ? `，显示前 ${result.data.length} 篇` : ""}。`
    : `搜索“${keyword}”。`;
  return <ResultList title="搜索手记" summary={summary} clearHref="/notes" items={result && toItems(result.data)} emptyText="没有匹配的手记，换个关键词试试。" />;
}

export async function NotesByTopic({ slug }: { slug: string }) {
  let topics: Awaited<ReturnType<typeof getTopics>> | null = null;
  try {
    topics = await getTopics();
  } catch (error) {
    unstable_rethrow(error);
  }
  const topic = topics?.find((item) => item.slug === slug);
  // 话题列表读到了但没有这个话题（或它下面没有公开手记）才是 404；读取失败显示错误提示。
  if (topics && !topic) notFound();
  let result: Awaited<ReturnType<typeof getNotesByTopic>> | null = null;
  if (topic) {
    try {
      result = await getNotesByTopic(topic.id);
    } catch (error) {
      unstable_rethrow(error);
    }
  }
  return <ResultList title={topic ? `话题：${topic.name}` : "话题"} summary={result ? `共 ${result.total} 篇。` : ""} clearHref="/notes" items={result && toItems(result.data)} emptyText="这个话题下还没有公开的手记。" />;
}
