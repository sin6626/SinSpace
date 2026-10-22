"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

const desktopQuery = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export default function ResizableLayout({
  children,
}: {
  children: [ReactNode, ReactNode, ReactNode];
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
  const [navigation, content, details] = children;

  if (!desktop) return <div className="site-shell">{children}</div>;

  return (
    <Group className="site-shell resizable-shell" style={{ overflow: "visible" }}>
      <Panel
        defaultSize="14rem"
        minSize="12rem"
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
