import { Suspense } from "react";
import Balcony from "@/components/balcony";
import HomeIntro from "@/components/home-intro";
import HomeLatest from "@/components/home-latest";
import { getSiteSettings, siteDescription, siteName } from "@/lib/blog-data";

// 首屏文字：后台的站名和站点描述（“夜深里也有月亮和星星陪我作伴”）。
async function SceneText() {
  const settings = await getSiteSettings().catch(() => null);
  return (
    <>
      <h1>{settings?.name ?? siteName}</h1>
      <p>{settings?.description ?? siteDescription}</p>
    </>
  );
}

export default function Home() {
  return (
    <>
      <Balcony>
        <Suspense fallback={<><h1>{siteName}</h1><p>{siteDescription}</p></>}>
          <SceneText />
        </Suspense>
      </Balcony>
      <div className="home-room" id="home-room">
        <Suspense fallback={null}>
          <HomeIntro />
        </Suspense>
        <Suspense fallback={<p className="post-list-content" role="status">正在读取最新内容…</p>}>
          <HomeLatest />
        </Suspense>
      </div>
    </>
  );
}
