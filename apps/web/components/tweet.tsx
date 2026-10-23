"use client";

// 来自 ShrioRenovation 3ca2cc7（兼容推文缺失字段并隔离卡片渲染异常）。
// 线上部分推文响应缺少 entities 数组，react-tweet 遍历 undefined 会让整篇正文渲染失败；
// 这里补齐数组，其他异常降级为原帖链接，不影响正文其余部分。
import Image from "next/image";
import { useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { EmbeddedTweet, TweetSkeleton, useTweet, type TwitterComponents } from "react-tweet";
import type { Tweet as TweetData } from "react-tweet/api";

function normalizeTweet(tweet: TweetData): TweetData {
  const normalized = structuredClone(tweet);
  for (const item of [normalized, normalized.quoted_tweet]) {
    if (!item) continue;
    item.entities = {
      ...item.entities,
      hashtags: item.entities?.hashtags ?? [],
      user_mentions: item.entities?.user_mentions ?? [],
      urls: item.entities?.urls ?? [],
      symbols: item.entities?.symbols ?? [],
    };
  }
  return normalized;
}

// 图片来自 twimg，unoptimized 直接加载，不需要在 next.config 登记远程域名。
const components: TwitterComponents = {
  AvatarImg: (props) => <Image {...props} unoptimized alt="avatar" />,
  MediaImg: (props) => <Image {...props} fill unoptimized alt="tweet-media" style={{ objectFit: "cover" }} />,
};

function TweetLink({ id }: { id: string }) {
  return (
    <a href={`https://x.com/i/status/${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer">
      在 X / Twitter 查看原帖
    </a>
  );
}

function TweetContent({ id }: { id: string }) {
  const { data, error, isLoading } = useTweet(id);
  const tweet = useMemo(() => (data ? normalizeTweet(data) : null), [data]);
  if (isLoading) return <TweetSkeleton />;
  if (error || !tweet) return <TweetLink id={id} />;
  return <EmbeddedTweet tweet={tweet} components={components} />;
}

function Tweet({ id }: { id: string }) {
  return (
    <ErrorBoundary fallback={<TweetLink id={id} />} resetKeys={[id]}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <TweetContent id={id} />
      </div>
    </ErrorBoundary>
  );
}

// 富文本里的推文嵌入节点只给 url，这里解析出推文 ID。
export function TweetEmbed({ url }: { url: string }) {
  const id = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(?:[^/]+|i\/web)\/status\/(\d+)(?:[/?#]|$)/.exec(url)?.[1];
  if (!id) return <span>推文链接无效</span>;
  return <Tweet id={id} />;
}
