import { Suspense } from "react";
import HomeHero from "@/components/home-hero";
import HomeLatest from "@/components/home-latest";

export default function Home() {
  return (
    <>
      <HomeHero />
      <div className="home-room" id="home-room">
        <Suspense fallback={<p className="post-list-content" role="status">正在读取最新内容…</p>}>
          <HomeLatest />
        </Suspense>
      </div>
    </>
  );
}
