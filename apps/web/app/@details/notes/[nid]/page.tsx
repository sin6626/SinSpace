import ArticleToc from "@/components/article-toc";
import DefaultDetails from "@/components/default-details";

// 手记详情页右栏：正文标题目录；没有标题时显示默认内容。
export default function NoteToc() {
  return <ArticleToc><DefaultDetails /></ArticleToc>;
}
