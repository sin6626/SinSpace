import type { Metadata } from "next";
import { Suspense } from "react";
import FriendList from "@/components/friend-list";

export const metadata: Metadata = { title: "友链" };

export default function FriendListPage() {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取友链…</p>}>
      <FriendList />
    </Suspense>
  );
}
