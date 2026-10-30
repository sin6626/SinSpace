import { Suspense } from "react";
import HomeHero from "@/components/home-hero";
import HomeLatest from "@/components/home-latest";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  return (
    <>
      <HomeHero />
      <div className="home-room" id="home-room">
        <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
          <HomeLatest />
        </Suspense>
      </div>
    </>
  );
}
