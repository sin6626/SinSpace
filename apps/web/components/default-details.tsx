import { Suspense } from "react";
import { getSubscribeOptions } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import SubscribeForm from "./subscribe-form";
import "./details-sidebar.css";

function Placeholder() {
  return (
    <>
      <h2>补充信息</h2>
      <p>这里将展示与当前内容相关的信息。</p>
    </>
  );
}

// 订阅开关是短缓存数据，不能挡住页面的静态外壳（否则开发期会报“导航不是即时的”），放进自己的 Suspense。
async function SubscribeOrPlaceholder() {
  const subscribe = await getSubscribeOptions().catch(() => null);
  return subscribe?.enabled ? <SubscribeForm apiUrl={getApiUrl()} types={subscribe.types} /> : <Placeholder />;
}

// 右栏默认内容：没有专属右栏的页面（首页、详情页、作品等）都显示这里。
// 后台开启邮件订阅时显示订阅表单，否则保留占位说明。
export default function DefaultDetails() {
  return (
    <Suspense fallback={<Placeholder />}>
      <SubscribeOrPlaceholder />
    </Suspense>
  );
}
