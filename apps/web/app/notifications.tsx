"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Toast } from "@base-ui/react/toast";
import { io, type Socket } from "socket.io-client";
import { getNotification, notificationSettings } from "../lib/notification-copy";
import "./notifications.css";

const SocketContext = createContext<Socket | null>(null);

export default function Notifications({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <Toast.Provider timeout={notificationSettings.timeout} limit={notificationSettings.limit}>
      <Connection url={url}>{children}</Connection>
      <Toast.Portal>
        <Toast.Viewport className="notification-viewport" aria-label="博客通知">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function Connection({ url, children }: { url: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { add } = Toast.useToastManager();
  useEffect(() => {
    const connection = io(url, { transports: ["websocket"], autoConnect: false });
    const onMessage = (message: unknown) => {
      const notification = getNotification(message);
      if (notification) add(notification);
    };
    connection.on("message", onMessage);
    connection.on("connect", () => setSocket(connection));
    connection.connect();
    return () => {
      connection.off("message", onMessage);
      connection.disconnect();
    };
  }, [url, add]);
  return <SocketContext value={socket}>{children}</SocketContext>;
}

export function ArticleNotifications({ id }: { id: string }) {
  const socket = useContext(SocketContext);
  useEffect(() => {
    if (!socket) return;
    const roomName = `article-${id}`;
    const join = () => socket.emit("message", { type: "join", payload: { roomName } });
    socket.on("connect", join);
    if (socket.connected) join();
    return () => {
      socket.off("connect", join);
      if (socket.connected) socket.emit("message", { type: "leave", payload: { roomName } });
    };
  }, [socket, id]);
  return null;
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast} className="notification-toast">
      <Toast.Content className="notification-content">
        <div className="notification-text">
          <Toast.Title className="notification-title" />
          <Toast.Description className="notification-description" />
        </div>
        <Toast.Close className="notification-close">{notificationSettings.close}</Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}
