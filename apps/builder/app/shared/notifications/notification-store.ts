/**
 * A generic, UI-agnostic notification polling store.
 *
 * Decoupled from any specific notification type, transport, or UI framework.
 * Uses nanostores for reactive state and accepts injectable fetchers so the
 * same abstraction works with tRPC, REST, or any async data source.
 *
 * Features:
 * - Configurable polling interval
 * - Automatic pause when the document is hidden (Page Visibility API)
 * - Immediate re-fetch on tab focus
 * - Deduplication — overlapping fetches are skipped
 * - Graceful error handling with retry
 * - Start/stop lifecycle control
 * - `onCountChange` callback for side-effect hooks (e.g., title badge, sound)
 */
import { atom } from "nanostores";

export type NotificationFetchers<T> = {
  /** Fetch the count of pending notifications. */
  fetchCount: () => Promise<number>;
  /** Fetch the full list of pending notifications. */
  fetchList: () => Promise<T[]>;
};

export type NotificationStoreOptions<T> = NotificationFetchers<T> & {
  /**
   * Polling interval in milliseconds.
   * @default 30_000
   */
  intervalMs?: number;
  /**
   * Called whenever the pending count changes (including the initial fetch).
   * Useful for updating a page title badge, playing a sound, etc.
   */
  onCountChange?: (next: number, prev: number) => void;
};

const DEFAULT_INTERVAL_MS = 30_000;

const hasDocument = () => typeof document !== "undefined";

/**
 * Create a notification polling store.
 *
 * Returns reactive nanostores atoms and imperative lifecycle methods.
 * The store is intentionally not a singleton — callers can create multiple
 * instances for different notification channels if needed.
 */
export const createNotificationStore = <T>(
  options: NotificationStoreOptions<T>
) => {
  const {
    fetchCount,
    fetchList,
    intervalMs = DEFAULT_INTERVAL_MS,
    onCountChange,
  } = options;

  const $count = atom<number>(0);
  const $items = atom<T[]>([]);
  const $active = atom<boolean>(false);

  let timerId: ReturnType<typeof setInterval> | undefined;
  let countPromise: Promise<void> | undefined;
  let listPromise: Promise<void> | undefined;

  // ── Count polling ──────────────────────────────────────────────────

  const pollCount = () => {
    if (countPromise !== undefined) {
      return countPromise;
    }
    countPromise = fetchCount()
      .then((next) => {
        const prev = $count.get();
        $count.set(next);
        if (next !== prev) {
          onCountChange?.(next, prev);
        }
      })
      .catch(() => {
        // Silently swallow — badge just stays stale until next tick
      })
      .finally(() => {
        countPromise = undefined;
      });
    return countPromise;
  };

  // ── List fetching ──────────────────────────────────────────────────

  const loadList = () => {
    if (listPromise !== undefined) {
      return listPromise;
    }
    listPromise = fetchList()
      .then((items) => {
        $items.set(items);
        // Sync count from the list to avoid a stale badge
        const prev = $count.get();
        const next = items.length;
        $count.set(next);
        if (next !== prev) {
          onCountChange?.(next, prev);
        }
      })
      .catch(() => {
        // Silently swallow
      })
      .finally(() => {
        listPromise = undefined;
      });
    return listPromise;
  };

  // ── Visibility handling ────────────────────────────────────────────

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      // Tab became visible — immediate poll then resume interval
      pollCount();
      startInterval();
    } else {
      // Tab hidden — pause polling to save resources
      stopInterval();
    }
  };

  // ── Interval helpers ───────────────────────────────────────────────

  const startInterval = () => {
    stopInterval();
    timerId = setInterval(pollCount, intervalMs);
  };

  const stopInterval = () => {
    if (timerId !== undefined) {
      clearInterval(timerId);
      timerId = undefined;
    }
  };

  // ── Public lifecycle ───────────────────────────────────────────────

  /**
   * Start polling. Performs an immediate count fetch, then polls at the
   * configured interval. Attaches a visibility-change listener to pause
   * when the tab is hidden and resume + immediate-fetch when visible.
   *
   * Calling `start()` when already active is a no-op.
   */
  const start = () => {
    if ($active.get()) {
      return;
    }
    $active.set(true);
    pollCount();
    startInterval();
    if (hasDocument()) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
  };

  /**
   * Stop polling and clean up all timers and listeners.
   *
   * Calling `stop()` when already inactive is a no-op.
   */
  const stop = () => {
    if ($active.get() === false) {
      return;
    }
    $active.set(false);
    stopInterval();
    if (hasDocument()) {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };

  /**
   * Optimistically remove a notification from the local list and
   * decrement the count. Useful after accept/decline so the UI
   * updates instantly without waiting for the next poll.
   */
  const removeItem = (predicate: (item: T) => boolean) => {
    const prev = $items.get();
    const next = prev.filter((item) => predicate(item) === false);
    $items.set(next);
    const removed = prev.length - next.length;
    if (removed > 0) {
      const prevCount = $count.get();
      const nextCount = Math.max(0, prevCount - removed);
      $count.set(nextCount);
      if (nextCount !== prevCount) {
        onCountChange?.(nextCount, prevCount);
      }
    }
  };

  /**
   * Force an immediate count refresh (e.g., after a mutation that may
   * have created new notifications).
   */
  const refresh = () => pollCount();

  return {
    /** Reactive atom: pending notification count. */
    $count,
    /** Reactive atom: list of pending notifications. */
    $items,
    /** Reactive atom: whether polling is active. */
    $active,
    /** Start polling. */
    start,
    /** Stop polling and clean up. */
    stop,
    /** Fetch the full notification list into `$items`. */
    loadList,
    /** Optimistically remove items matching the predicate. */
    removeItem,
    /** Force an immediate count poll. */
    refresh,
  };
};

export type NotificationStore<T> = ReturnType<
  typeof createNotificationStore<T>
>;
