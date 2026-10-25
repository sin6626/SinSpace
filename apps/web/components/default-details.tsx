import { getSubscribeOptions } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import SubscribeForm from "./subscribe-form";
import "./details-sidebar.css";

// 右栏默认内容：没有专属右栏的页面（首页、详情页、作品等）都显示这里。
// 后台开启邮件订阅时显示订阅表单，否则保留占位说明。
export default async function DefaultDetails() {
  const subscribe = await getSubscribeOptions().catch(() => null);
  if (subscribe?.enabled) return <SubscribeForm apiUrl={getApiUrl()} types={subscribe.types} />;
  return (
    <>
      <h2>补充信息</h2>
      <p>这里将展示与当前内容相关的信息。</p>
    </>
  );
}
