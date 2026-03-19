/**
 * Cross-tab polling deduplication.
 *
 * When the dashboard is open in multiple browser tabs, only the
 * **leader** tab actively polls the server. Follower tabs receive
 * data via `BroadcastChannel` and never make their own requests.
 *
 * Leader election uses a heartbeat protocol:
 * 1. On creation every tab tries to claim leadership.
 * 2. The leader sends periodic heartbeats; followers listen.
 * 3. If a follower stops hearing heartbeats it promotes itself.
 * 4. When a leader is destroyed it broadcasts an abdication so
 *    failover is immediate rather than waiting for the timeout.
 *
 * The public API is identical to `PollingManager` so consumers
 * swap in `createCrossTabPollingManager` with no other changes.
 */
import {
  createPollingManager,
  type PollingManager,
  type PollingManagerOptions,
  type Subscription,
} from "./polling-manager";
import type { TopicName, TopicRegistry, SubscriptionResponse } from "./types";

// ── Channel message types ────────────────────────────────────────

type HeartbeatMsg = { kind: "heartbeat"; leaderId: string };
type AbdicateMsg = { kind: "abdicate"; leaderId: string };
type DataMsg = { kind: "data"; payload: SubscriptionResponse };
type TopicSyncMsg = { kind: "topic-sync"; topics: TopicName[] };

type ChannelMsg = HeartbeatMsg | AbdicateMsg | DataMsg | TopicSyncMsg;

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_CHANNEL_NAME = "polly";
const HEARTBEAT_INTERVAL = 2_000;
const HEARTBEAT_TIMEOUT = HEARTBEAT_INTERVAL * 3;

// ── Options ──────────────────────────────────────────────────────

export type CrossTabPollingManagerOptions = PollingManagerOptions & {
  /**
   * BroadcastChannel name shared by all tabs.
   * @default "polly"
   */
  channelName?: string;

  /**
   * Milliseconds between leader heartbeats.
   * @default 2000
   */
  heartbeatInterval?: number;

  /**
   * Milliseconds a follower waits before assuming the leader is
   * gone and promoting itself.
   * @default 6000 (3 × heartbeatInterval)
   */
  heartbeatTimeout?: number;

  /**
   * Unique identifier for this tab.  Auto-generated when omitted.
   */
  tabId?: string;

  /**
   * Injectable BroadcastChannel constructor — allows tests to
   * provide a mock without touching the global.
   * @default globalThis.BroadcastChannel
   */
  createChannel?: (name: string) => BroadcastChannel;
};

// ── Factory ──────────────────────────────────────────────────────

export const createCrossTabPollingManager = (
  options: CrossTabPollingManagerOptions
): PollingManager => {
  const {
    channelName = DEFAULT_CHANNEL_NAME,
    heartbeatInterval = HEARTBEAT_INTERVAL,
    heartbeatTimeout = HEARTBEAT_TIMEOUT,
    tabId = crypto.randomUUID(),
    createChannel = (name: string) => new BroadcastChannel(name),
    ...managerOptions
  } = options;

  // ── State ────────────────────────────────────────────────────

  let isLeader = false;
  let destroyed = false;
  let inner: PollingManager | undefined;
  let heartbeatTimerId: ReturnType<typeof setInterval> | undefined;
  let watchdogTimerId: ReturnType<typeof setTimeout> | undefined;

  type Listener = (data: never) => void;
  const localListeners = new Map<TopicName, Set<Listener>>();
  const innerSubs = new Map<TopicName, Subscription>();
  const channel = createChannel(channelName);
  // Per-topic JSON snapshots for equality checking — suppresses
  // duplicate dispatches when polling returns unchanged data.
  const snapshots = new Map<TopicName, string>();
  // ── Helpers ──────────────────────────────────────────────────

  const getLocalTopics = (): TopicName[] => {
    const topics: TopicName[] = [];
    for (const [topic, set] of localListeners) {
      if (set.size > 0) {
        topics.push(topic);
      }
    }
    return topics;
  };

  const post = (msg: ChannelMsg) => {
    try {
      channel.postMessage(msg);
    } catch {
      // Channel may already be closed during teardown — ignore.
    }
  };

  // ── Dispatch to local listeners ──────────────────────────────

  const dispatchLocally = (response: SubscriptionResponse) => {
    for (const [topic, set] of localListeners) {
      if (!(topic in response)) {
        continue;
      }
      const data = response[topic];
      const serialized = JSON.stringify(data);
      if (snapshots.get(topic) === serialized) {
        continue;
      }
      snapshots.set(topic, serialized);
      for (const fn of set) {
        fn(data as never);
      }
    }
  };

  // ── Leader lifecycle ─────────────────────────────────────────

  const becomeLeader = () => {
    if (isLeader || destroyed) {
      return;
    }
    isLeader = true;
    stopWatchdog();
    // Clear snapshots so the first poll after promotion always dispatches
    // — the follower's cached snapshots came from BroadcastChannel data
    // messages which may be stale or incomplete after a leadership change.
    snapshots.clear();

    // Wrap the original fetcher so we can broadcast responses to
    // follower tabs and dispatch to our own local listeners.
    const wrappedFetcher = async (
      topics: TopicName[]
    ): Promise<SubscriptionResponse> => {
      const response = await managerOptions.fetcher(topics);
      post({ kind: "data", payload: response });
      dispatchLocally(response);
      return response;
    };

    inner = createPollingManager({
      ...managerOptions,
      fetcher: wrappedFetcher,
    });

    // Subscribe the inner manager to every topic that local
    // listeners care about. Keep handles so we can unsub later.
    for (const topic of getLocalTopics()) {
      if (innerSubs.has(topic) === false) {
        const sub = inner.subscribe(topic, () => {
          // Data dispatch is handled by the wrapped fetcher callback
          // inside the inner manager already. We subscribe here only
          // so the inner manager knows which topics to request.
        });
        innerSubs.set(topic, sub);
      }
    }

    // Start heartbeat.
    heartbeatTimerId = setInterval(() => {
      post({ kind: "heartbeat", leaderId: tabId });
    }, heartbeatInterval);

    // Send an initial heartbeat immediately so followers see us.
    post({ kind: "heartbeat", leaderId: tabId });
  };

  const resignLeadership = () => {
    if (heartbeatTimerId !== undefined) {
      clearInterval(heartbeatTimerId);
      heartbeatTimerId = undefined;
    }
    for (const sub of innerSubs.values()) {
      sub.unsubscribe();
    }
    innerSubs.clear();
    inner?.destroy();
    inner = undefined;
    isLeader = false;
  };

  // ── Watchdog (follower) ──────────────────────────────────────

  const resetWatchdog = () => {
    stopWatchdog();
    if (destroyed) {
      return;
    }
    watchdogTimerId = setTimeout(() => {
      // Leader went silent — take over.
      becomeLeader();
    }, heartbeatTimeout);
  };

  const stopWatchdog = () => {
    if (watchdogTimerId !== undefined) {
      clearTimeout(watchdogTimerId);
      watchdogTimerId = undefined;
    }
  };

  // ── Channel message handler ──────────────────────────────────

  const onMessage = (event: MessageEvent<ChannelMsg>) => {
    if (destroyed) {
      return;
    }
    const msg = event.data;

    switch (msg.kind) {
      case "heartbeat": {
        if (isLeader && msg.leaderId !== tabId) {
          // Another leader exists — the tab with the lower id wins.
          if (msg.leaderId < tabId) {
            resignLeadership();
            resetWatchdog();
          } else {
            // Higher-id tab is claiming — assert our leadership so
            // it resigns immediately instead of waiting for the next
            // interval heartbeat.
            post({ kind: "heartbeat", leaderId: tabId });
          }
          return;
        }
        if (isLeader === false) {
          resetWatchdog();
        }
        return;
      }

      case "abdicate": {
        if (isLeader === false) {
          // Leader left — try to claim immediately.
          stopWatchdog();
          becomeLeader();
        }
        return;
      }

      case "data": {
        if (isLeader === false) {
          dispatchLocally(msg.payload);
        }
        return;
      }

      case "topic-sync": {
        if (isLeader && inner) {
          // A follower subscribed to topics we aren't tracking yet.
          const currentTopics = getLocalTopics();
          for (const topic of msg.topics) {
            if (
              currentTopics.includes(topic) === false &&
              innerSubs.has(topic) === false
            ) {
              // Subscribe inner manager so it includes this topic.
              const sub = inner.subscribe(topic, () => {});
              innerSubs.set(topic, sub);
            }
          }
          inner.refresh();
        }
        return;
      }
    }
  };

  channel.addEventListener("message", onMessage);

  // ── Election on startup ──────────────────────────────────────
  // Every tab starts as a follower with a watchdog. If no heartbeat
  // arrives within the timeout the tab promotes itself. To speed up
  // the first-tab case we also try to claim immediately — if a leader
  // already exists its heartbeat will arrive and the duplicate is
  // resolved in the heartbeat handler above.

  becomeLeader();

  // ── Public API (same shape as PollingManager) ────────────────

  const subscribe = <K extends TopicName>(
    topic: K,
    listener: (data: TopicRegistry[K]) => void
  ): Subscription => {
    let set = localListeners.get(topic);
    if (set === undefined) {
      set = new Set();
      localListeners.set(topic, set);
    }
    set.add(listener as Listener);

    if (isLeader && inner) {
      // Leader — make sure inner manager is subscribed.
      if (innerSubs.has(topic) === false) {
        const sub = inner.subscribe(topic, () => {});
        innerSubs.set(topic, sub);
      }
      inner.refresh();
    } else {
      // Follower — ask leader to add the topic.
      post({ kind: "topic-sync", topics: getLocalTopics() });
    }

    return {
      unsubscribe: () => {
        const current = localListeners.get(topic);
        if (current === undefined) {
          return;
        }
        current.delete(listener as Listener);
        if (current.size === 0) {
          localListeners.delete(topic);
          // No local listeners left for this topic — unsubscribe
          // the inner manager to prevent orphaned subscriptions.
          innerSubs.get(topic)?.unsubscribe();
          innerSubs.delete(topic);
        }
      },
    };
  };

  const refresh = (): Promise<void> => {
    if (isLeader && inner) {
      return inner.refresh();
    }
    // Followers can't force a refresh — ask the leader.
    post({ kind: "topic-sync", topics: getLocalTopics() });
    return Promise.resolve();
  };

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;

    if (isLeader) {
      post({ kind: "abdicate", leaderId: tabId });
      resignLeadership();
    }
    stopWatchdog();

    channel.removeEventListener("message", onMessage);
    channel.close();
    localListeners.clear();
    innerSubs.clear();
    snapshots.clear();
  };

  return { subscribe, refresh, destroy };
};
