import { AckController } from './ack'
import { ActivityController } from './activity'
import { AggregateController } from './aggregate'
import { AIController } from './ai'
import { CategoryController } from './category'
import { CommentController } from './comment'
import { LinkController } from './link'
import { MurmurController } from './murmur'
import type {
  NoteMiddleListOptions,
  NoteTimelineItem,
  NoteTopicListItem,
  NoteTopicListOptions,
} from './note'
import { NoteController } from './note'
import { UserController } from './owner'
import { PageController } from './page'
import type { PostListItem, PostListOptions } from './post'
import { PostController } from './post'
import { ProjectController } from './project'
import {
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
  RecentlyController,
} from './recently'
import { SayController } from './say'
import { SearchController } from './search'
import { ServerlessController } from './severless'
import { SnippetController } from './snippet'
import { SubscribeController } from './subscribe'
import { TopicController } from './topic'

export const allControllers = [
  AckController,
  ActivityController,
  AggregateController,
  AIController,
  CategoryController,
  CommentController,
  LinkController,
  MurmurController,
  NoteController,
  PageController,
  PostController,
  ProjectController,
  RecentlyController,
  SayController,
  SearchController,
  ServerlessController,
  SnippetController,
  SubscribeController,
  TopicController,
  UserController,
]

export const allControllerNames = [
  'ai',
  'ack',
  'activity',
  'aggregate',
  'category',
  'comment',
  'link',
  'murmur',
  'note',
  'page',
  'post',
  'project',
  'topic',
  'recently',
  'say',
  'search',
  'snippet',
  'serverless',
  'subscribe',
  'owner',

  // alias,
  'friend',
  'shorthand',
] as const

export {
  AckController,
  ActivityController,
  AggregateController,
  AIController,
  CategoryController,
  CommentController,
  LinkController,
  MurmurController,
  NoteController,
  PageController,
  PostController,
  ProjectController,
  // Enum
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
  RecentlyController,
  SayController,
  SearchController,
  ServerlessController,
  SnippetController,
  SubscribeController,
  TopicController,
  UserController,
}

export type {
  NoteMiddleListOptions,
  NoteTimelineItem,
  NoteTopicListItem,
  NoteTopicListOptions,
}
export type { PostListItem, PostListOptions }
