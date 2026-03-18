import { notification } from "@webstudio-is/project/index.server";
import type { TopicResolvers, TopicName, SubscriptionResponse } from "./types";

/**
 * Server-side resolver for every topic in the registry.
 *
 * The `TopicResolvers` mapped type guarantees that every key in
 * `TopicRegistry` has a corresponding resolver here. Adding a topic
 * to the registry without implementing it causes a compile error.
 */
const resolvers: TopicResolvers = {
  notifications: (ctx) => notification.list(ctx),
};

/**
 * Resolve a subset of topics in parallel.
 *
 * Individual topic failures are silently skipped so one broken
 * resolver doesn't take down the entire response. The client
 * will retry on the next poll cycle.
 */
export const resolveTopics = async (
  topics: readonly TopicName[],
  ctx: Parameters<TopicResolvers[TopicName]>[0]
): Promise<SubscriptionResponse> => {
  const entries = await Promise.all(
    topics.map(async (topic) => {
      try {
        const data = await resolvers[topic](ctx);
        return [topic, data] as const;
      } catch (error) {
        // Log but skip — the client retries on next poll cycle.
        console.error(`[polly] resolver failed for topic "${topic}"`, error);
        return undefined;
      }
    })
  );

  return Object.fromEntries(
    entries.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== undefined
    )
  ) as SubscriptionResponse;
};
