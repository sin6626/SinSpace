import "server-only";
import { AIController, ActivityController, AggregateController, CategoryController, CommentController, LinkController, NoteController, PageController, PostController, ProjectController, RecentlyController, SayController, SearchController, SubscribeController, TopicController, createClient } from "@mx-space/api-client";
import { fetchAdaptor } from "@mx-space/api-client/dist/adaptors/fetch";
import { unstable_rethrow } from "next/navigation";
import { getApiUrl } from "./config";

const adapter: typeof fetchAdaptor = {
  ...fetchAdaptor,
  get(url, options) {
    return fetchAdaptor.get(url, {
      ...options,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  },
};

export function getApiClient() {
  return createClient(adapter)(getApiUrl(), {
    controllers: [ActivityController, AggregateController, CategoryController, PostController, NoteController, PageController, ProjectController, SearchController, TopicController, LinkController, SayController, RecentlyController, CommentController, SubscribeController, AIController],
    customThrowResponseError(error) {
      unstable_rethrow(error);
      throw error;
    },
  });
}
