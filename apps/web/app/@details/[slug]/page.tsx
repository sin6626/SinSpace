import ArticleToc from "@/components/article-toc";
import DefaultDetails from "@/components/default-details";

// 独立页面（关于我等）详情页右栏：正文标题目录；没有标题时显示默认内容。
export default function PageToc() {
  return <ArticleToc><DefaultDetails /></ArticleToc>;
}
