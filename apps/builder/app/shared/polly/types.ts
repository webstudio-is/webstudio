/**
 * Topic-based subscription registry.
 *
 * This file is the single source of truth for every "topic" the
 * universal polling endpoint can serve. Adding a new topic is a
 * three-step process:
 *
 * 1. Add a key → return-type entry to `TopicRegistry`.
 * 2. Add the same key to the `topicNames` array.
 * 3. Implement a resolver in `topic-resolvers.server.ts`.
 *
 * TypeScript will error if any step is skipped:
 * - Missing from `topicNames` → `EnsureAllTopicsCovered` fires.
 * - Missing resolver → `TopicResolvers` mapped type fires.
 *
 * ── Future topic ideas (implement when needed) ──────────────────
 *
 * - publish status    — replace the manual while-loop in publish.tsx
 * - build status      — same pattern as publish for static builds
 * - dashboard refresh — periodic revalidation of the project list
 * - session keepalive — detect expired sessions before a save fails
 * - presence          — collaborative multi-user cursors (needs arch)
 */

import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { notification } from "@webstudio-is/project/index.server";

// ── 1. Registry ──────────────────────────────────────────────────
// Map every topic name to the data type the resolver returns.

export type Notifications = Awaited<ReturnType<typeof notification.list>>;

export type TopicRegistry = {
  notifications: Notifications;
  projectCount: number;
  /** Workspace name when the current user's seat in a shared workspace is suspended, false otherwise. */
  seatSuspended: string | false;
  /** The builder's deployed version string (GITHUB_SHA or "local"). */
  builderVersion: string;
};

// ── 2. Derived helpers ───────────────────────────────────────────

export type TopicName = keyof TopicRegistry;

export type TopicData<K extends TopicName> = TopicRegistry[K];

/**
 * Runtime array of every topic name.
 * `satisfies` guarantees each element is a valid `TopicName`.
 */
export const topicNames = [
  "notifications",
  "projectCount",
  "seatSuspended",
  "builderVersion",
] as const satisfies readonly TopicName[];

// Compile-time check: every `TopicRegistry` key must appear in `topicNames`.
// If you add a topic to the registry but forget `topicNames`, this line errors.
// prettier-ignore
type EnsureAllTopicsCovered =
  Exclude<TopicName, (typeof topicNames)[number]> extends never
    ? true
    : "ERROR: topicNames is missing entries from TopicRegistry";
const _allTopicsCovered: EnsureAllTopicsCovered = true;
void _allTopicsCovered;

// ── 3. Wire types ────────────────────────────────────────────────

/** Response shape returned by the universal polling endpoint. */
export type SubscriptionResponse = {
  [K in TopicName]?: TopicRegistry[K];
};

/**
 * Resolver map that the server must implement.
 * Every `TopicName` key is **required** — omitting one is a type error.
 */
export type TopicResolvers = {
  [K in TopicName]: (ctx: AppContext) => Promise<TopicRegistry[K]>;
};
