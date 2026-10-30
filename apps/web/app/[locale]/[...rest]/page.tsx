import { notFound } from "next/navigation";

// 页面都在 app/[locale] 下以后，没有任何路由能接住的多级地址（如 /a/b/c）走这里，显示站内 404（保留导航）
export default function UnknownPage() {
  notFound();
}
