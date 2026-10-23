"use client";

import { Toast } from "@base-ui/react/toast";
import { notificationCopy } from "../../lib/notification-copy";

// 只在当前页面弹出，不经过 WebSocket，也不会让缓存失效。
export default function ToastButtons() {
  const { add } = Toast.useToastManager();
  return (
    <div className="post-categories">
      {Object.entries(notificationCopy).map(([type, copy]) => (
        <button key={type} className="notification-close" type="button" onClick={() => add(copy)}>
          {copy.title}
        </button>
      ))}
    </div>
  );
}
