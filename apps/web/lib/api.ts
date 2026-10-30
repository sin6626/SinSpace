import "server-only";
import { AIController, ActivityController, AggregateController, CategoryController, CommentController, LinkController, MurmurController, NoteController, PageController, PostController, ProjectController, RecentlyController, SayController, SearchController, SnippetController, SubscribeController, TopicController, createClient } from "@mx-space/api-client";
import { fetchAdaptor } from "@mx-space/api-client/dist/adaptors/fetch";
import { unstable_rethrow } from "next/navigation";
import { getApiUrl } from "./config";

// lang：外文页面向 Core 要内容时带上 ?lang=en|ja，Core 会把已有的译文换进去（文章、手记的标题和正文、分类名、话题、心情、天气，
// 来自后台的 AI 翻译和“翻译条目”）；没有译文的保持中文。用查询参数而不是 x-lang 请求头：Core 的接口缓存按地址区分。
function adapterFor(lang?: string): typeof fetchAdaptor {
  return {
    ...fetchAdaptor,
    get(url, options) {
      const target = lang ? `${url}${url.includes("?") ? "&" : "?"}lang=${encodeURIComponent(lang)}` : url;
      return fetchAdaptor.get(target, {
        ...options,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    },
  };
}

export function getApiClient(lang?: string) {
  return createClient(adapterFor(lang && lang !== "zh" ? lang : undefined))(getApiUrl(), {
    controllers: [ActivityController, AggregateController, CategoryController, PostController, NoteController, PageController, ProjectController, SearchController, TopicController, LinkController, MurmurController, SayController, RecentlyController, CommentController, SubscribeController, SnippetController, AIController],
    customThrowResponseError(error) {
      unstable_rethrow(error);
      throw error;
    },
  });
}
