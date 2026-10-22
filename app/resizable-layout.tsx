"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

const desktopQuery = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  // MDN 原生API来进行媒体查询, query.matches返回true or false
  const query = window.matchMedia(desktopQuery);
  // 给媒体查询注册一个监听器
  query.addEventListener("change", onChange);
  // 清理函数
  return () => query.removeEventListener("change", onChange);
}

export default function ResizableLayout({
  children,
}: {
  children: [ReactNode, ReactNode, ReactNode];
}) {
  // useSyncExternaleStore, 监听React外部的数据, 数据变化则重新渲染
  const desktop = useSyncExternalStore(
    subscribe,
    // 返回的值
    () => window.matchMedia(desktopQuery).matches,
    // 默认值
    () => false,
  );
  const [navigation, content, details] = children;

  // 
  if (!desktop) return <div className="site-shell">{children}</div>;

  return (
    <Group className="site-shell resizable-shell" style={{ overflow: "visible" }}>
      <Panel
        defaultSize="14rem"
        minSize="12rem"
        // 下面这行意为, 当Pannel宽度被改变的时候, 尽量保持像素不变
        groupResizeBehavior="preserve-pixel-size"
        style={{ overflow: "visible" }}
      >
        {navigation}
      </Panel>
      <Separator className="resize-handle" aria-label="调整导航栏宽度" disableDoubleClick />
      <Panel minSize="20rem" style={{ overflow: "visible" }}>
        {content}
      </Panel>
      <Separator className="resize-handle" aria-label="调整信息栏宽度" disableDoubleClick />
      <Panel
        defaultSize="20rem"
        minSize="16rem"
        groupResizeBehavior="preserve-pixel-size"
        style={{ overflow: "visible" }}
      >
        {details}
      </Panel>
    </Group>
  );
}
