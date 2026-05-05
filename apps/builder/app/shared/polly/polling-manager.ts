/**
 * Client-side polling manager with topic-based subscriptions.
 *
 * Wraps `createPollingClient` so that consumers subscribe to typed
 * topics instead of managing polling lifecycle themselves.
 *
 * - The first subscription starts polling; removing the last stops it.
 * - Adding a subscription for a *new* topic triggers an immediate
 *   refresh so the subscriber gets data without waiting for the next
 *   interval.
 * - Per-topic equality (JSON serialisation) suppresses duplicate
 *   dispatches to listeners.
 *
 * Usage:
 *
 * ```ts
 * const manager = createPollingManager({
 *   fetcher: (topics) => nativeClient.polly.poll.query({ topics }),
 * });
 *
 * const sub = manager.subscribe("notifications", (list) => {
 *   // list is typed as Notifications
 *   $notifications.set(list);
 * });
 *
 * // later
 * sub.unsubscribe();
 * ```
 */
import { createPollingClient, type PollingClient } from "./polling-client";
import type { TopicName, TopicRegistry, SubscriptionResponse } from "./types";

export type PollingManagerOptions = {
  /** Fetches data for the requested topics from the server. */
  fetcher: (topics: TopicName[]) => Promise<SubscriptionResponse>;
  /**
   * Polling interval in milliseconds.
   * @default 30_000
   */
  interval?: number;
  /**
   * Pause polling while the document is hidden.
   * @default true
   */
  pauseOnHidden?: boolean;
  /** Called when the fetcher throws. */
  onError?: (error: unknown) => void;
};

export type Subscription = {
  unsubscribe: () => void;
};

export type PollingManager = {
  /**
   * Subscribe to a topic. The listener receives strictly typed data
   * whenever the polled value changes.
   *
   * Returns a handle with an `unsubscribe` method.
   */
  subscribe: <K extends TopicName>(
    topic: K,
    listener: (data: TopicRegistry[K]) => void
  ) => Subscription;

  /** Force an immediate poll outside the regular interval. */
  refresh: () => Promise<void>;

  /** Stop polling and remove all subscriptions. */
  destroy: () => void;
};

export const createPollingManager = (
  options: PollingManagerOptions
): PollingManager => {
  const { fetcher, interval, pauseOnHidden, onError } = options;

  // ── Subscription bookkeeping ───────────────────────────────────

  type Listener = (data: never) => void;
  const listeners = new Map<TopicName, Set<Listener>>();
  // Per-topic JSON snapshot for equality checking.
  const snapshots = new Map<TopicName, string>();

  const getActiveTopics = (): TopicName[] => {
    const topics: TopicName[] = [];
    for (const [topic, set] of listeners) {
      if (set.size > 0) {
        topics.push(topic);
      }
    }
    return topics;
  };

  // ── Dispatch ───────────────────────────────────────────────────

  const dispatch = (response: SubscriptionResponse) => {
    for (const topic of getActiveTopics()) {
      if (!(topic in response)) {
        continue;
      }
      const data = response[topic];
      const serialized = JSON.stringify(data);
      if (snapshots.get(topic) === serialized) {
        continue;
      }
      snapshots.set(topic, serialized);
      const set = listeners.get(topic);
      if (set) {
        for (const fn of set) {
          fn(data as never);
        }
      }
    }
  };

  // ── Polling client lifecycle ───────────────────────────────────

  let client: PollingClient | undefined;

  const ensureClient = () => {
    if (client !== undefined) {
      return;
    }
    client = createPollingClient({
      // Always reads the *current* set of topics at call time.
      fetcher: () => fetcher(getActiveTopics()),
      interval,
      pauseOnHidden,
      onData: dispatch,
      onError,
    });
    client.start();
  };

  const stopIfIdle = () => {
    if (getActiveTopics().length > 0) {
      return;
    }
    client?.stop();
    client = undefined;
    snapshots.clear();
  };

  // ── Public API ─────────────────────────────────────────────────

  const subscribe = <K extends TopicName>(
    topic: K,
    listener: (data: TopicRegistry[K]) => void
  ): Subscription => {
    let set = listeners.get(topic);
    const isNewTopic = set === undefined || set.size === 0;

    if (set === undefined) {
      set = new Set();
      listeners.set(topic, set);
    }
    set.add(listener as Listener);

    ensureClient();

    // New topic added → immediate refresh so the subscriber gets data
    // quickly instead of waiting for the next interval.
    if (isNewTopic) {
      client?.refresh();
    }

    return {
      unsubscribe: () => {
        const current = listeners.get(topic);
        if (current === undefined) {
          return;
        }
        current.delete(listener as Listener);
        if (current.size === 0) {
          listeners.delete(topic);
          snapshots.delete(topic);
        }
        stopIfIdle();
      },
    };
  };

  const refresh = () => client?.refresh() ?? Promise.resolve();

  const destroy = () => {
    client?.stop();
    client = undefined;
    listeners.clear();
    snapshots.clear();
  };

  return { subscribe, refresh, destroy };
};
