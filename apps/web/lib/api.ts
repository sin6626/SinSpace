import "server-only";
import { AggregateController, CategoryController, LinkController, NoteController, PageController, PostController, ProjectController, RecentlyController, SayController, SearchController, TopicController, createClient } from "@mx-space/api-client";
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
    controllers: [AggregateController, CategoryController, PostController, NoteController, PageController, ProjectController, SearchController, TopicController, LinkController, SayController, RecentlyController],
    customThrowResponseError(error) {
      unstable_rethrow(error);
      throw error;
    },
  });
}
