/**
 * Generic, zero-dependency polling client.
 *
 * Repeatedly calls an async `fetcher` at a configurable interval and
 * delivers results via an `onData` callback. Handles:
 *
 * - Configurable interval (default 30 s)
 * - Incremental backoff with decorrelated jitter on errors
 * - Page Visibility API — pauses when the tab is hidden, resumes
 *   with an immediate fetch when visible
 * - Request deduplication — overlapping fetches are coalesced
 * - Optional equality check — skip `onData` when data hasn't changed
 * - Graceful error handling via `onError`
 *
 * The client is intentionally framework-agnostic. Wrap it with
 * nanostores, React state, Svelte stores, or anything else.
 */
import { createBackoff, type BackoffOptions } from "@webstudio-is/sync-client";

export type PollingClientOptions<T> = {
  /** Async function that fetches the data. */
  fetcher: () => Promise<T>;

  /**
   * Polling interval in milliseconds (used while healthy).
   * @default 30_000
   */
  interval?: number;

  /**
   * Called with fetched data on each successful poll.
   *
   * When `equals` is provided, this is only called when the data
   * actually changes (i.e. `equals(prev, next)` returns `false`).
   */
  onData: (data: T) => void;

  /**
   * Called when the fetcher throws.
   * If not provided, errors are silently swallowed and the next poll
   * proceeds as normal.
   */
  onError?: (error: unknown) => void;

  /**
   * Pause polling when the document is hidden and resume (with an
   * immediate fetch) when it becomes visible again.
   * @default true
   */
  pauseOnHidden?: boolean;

  /**
   * Optional equality check. When provided, `onData` is only called
   * when `equals(prev, next)` returns `false`.
   *
   * The first successful fetch always triggers `onData` regardless
   * of this function.
   */
  equals?: (prev: T, next: T) => boolean;

  /**
   * Backoff configuration for error recovery.
   *
   * When a fetch fails, the polling interval is replaced by
   * exponentially growing delays until a fetch succeeds, at which
   * point the normal interval resumes.
   *
   * Pass `false` to disable backoff (errors are ignored, next poll
   * fires at the normal interval). Pass an options object to
   * customise. Default: enabled with library defaults.
   *
   * @default {} (enabled with default backoff settings)
   */
  backoff?: BackoffOptions | false;
};

export type PollingClient = {
  /** Start polling. Performs an immediate fetch, then polls at interval. */
  start: () => void;
  /** Stop polling and clean up all timers and listeners. */
  stop: () => void;
  /** Force an immediate fetch outside the regular interval. */
  refresh: () => Promise<void>;
  /** Whether polling is currently active. */
  isActive: () => boolean;
};

const DEFAULT_INTERVAL = 30_000;

const hasDocument = () => typeof document !== "undefined";

export const createPollingClient = <T>(
  options: PollingClientOptions<T>
): PollingClient => {
  const {
    fetcher,
    interval = DEFAULT_INTERVAL,
    onData,
    onError,
    pauseOnHidden = true,
    equals,
    backoff: backoffOption = {},
  } = options;

  const backoff =
    backoffOption === false ? undefined : createBackoff(backoffOption);

  let active = false;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let pending: Promise<void> | undefined;
  // Wrapped in an object so we can distinguish "never fetched" from
  // "fetched but the value itself is undefined".
  let lastData: { value: T } | undefined;

  // ── Scheduling ─────────────────────────────────────────────────

  const scheduleNext = (delay: number) => {
    clearScheduled();
    timerId = setTimeout(poll, delay);
  };

  const clearScheduled = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  // ── Core fetch ─────────────────────────────────────────────────

  const poll = (): Promise<void> => {
    // Deduplicate: if a fetch is already in-flight, return it.
    if (pending !== undefined) {
      return pending;
    }

    pending = fetcher()
      .then((data) => {
        // Success — reset backoff, resume normal interval.
        backoff?.reset();

        // Skip onData when equals says data hasn't changed.
        if (
          equals !== undefined &&
          lastData !== undefined &&
          equals(lastData.value, data)
        ) {
          if (active) {
            scheduleNext(interval);
          }
          return;
        }
        lastData = { value: data };
        onData(data);

        if (active) {
          scheduleNext(interval);
        }
      })
      .catch((error: unknown) => {
        onError?.(error);

        // On error, schedule next attempt using backoff delay.
        if (active) {
          const delay = backoff !== undefined ? backoff.next() : interval;
          scheduleNext(delay);
        }
      })
      .finally(() => {
        pending = undefined;
      });

    return pending;
  };

  // ── Visibility ─────────────────────────────────────────────────

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      poll();
    } else {
      clearScheduled();
    }
  };

  // ── Public API ─────────────────────────────────────────────────

  const start = () => {
    if (active) {
      return;
    }
    active = true;
    poll();
    if (pauseOnHidden && hasDocument()) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
  };

  const stop = () => {
    if (active === false) {
      return;
    }
    active = false;
    clearScheduled();
    // Reset so the first fetch after a restart always delivers data.
    lastData = undefined;
    backoff?.reset();
    if (pauseOnHidden && hasDocument()) {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };

  const refresh = () => poll();

  const isActive = () => active;

  return { start, stop, refresh, isActive };
};
