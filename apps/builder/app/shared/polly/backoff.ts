/**
 * Incremental backoff with decorrelated jitter.
 *
 * Produces progressively longer delays after consecutive failures,
 * capped at a configurable maximum. Uses decorrelated jitter
 * (delay = random(base, prev × multiplier)) to prevent thundering-herd
 * when many clients retry simultaneously after a shared outage.
 *
 * The backoff is a pure, stateful object with no timers or side-effects.
 * Call `next()` to get the next delay, and `reset()` after a success.
 */

export type BackoffOptions = {
  /**
   * Base delay in milliseconds (also the minimum delay).
   * @default 5_000
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds. Delays are clamped to this value.
   * @default 120_000
   */
  maxDelay?: number;

  /**
   * Growth factor applied to the previous delay on each failure.
   * @default 3
   */
  multiplier?: number;

  /**
   * When `true` (default), use decorrelated jitter so that delays are
   * randomised between `baseDelay` and `lastDelay × multiplier`.
   *
   * Set to `false` for deterministic exponential growth (useful in tests).
   * @default true
   */
  jitter?: boolean;
};

export type Backoff = {
  /** Compute and return the next delay in ms. Increments the failure counter. */
  next: () => number;
  /** Reset to initial state (e.g. after a successful request). */
  reset: () => void;
  /** Number of consecutive failures since the last reset. */
  attempts: () => number;
};

const DEFAULT_BASE_DELAY = 5_000;
const DEFAULT_MAX_DELAY = 120_000;
const DEFAULT_MULTIPLIER = 3;

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export const createBackoff = (options?: BackoffOptions): Backoff => {
  const {
    baseDelay = DEFAULT_BASE_DELAY,
    maxDelay = DEFAULT_MAX_DELAY,
    multiplier = DEFAULT_MULTIPLIER,
    jitter = true,
  } = options ?? {};

  let failures = 0;
  let lastDelay = baseDelay;

  const next = () => {
    failures += 1;

    if (jitter) {
      // Decorrelated jitter: next delay is random between baseDelay and last × multiplier
      lastDelay = Math.min(
        maxDelay,
        randomBetween(baseDelay, lastDelay * multiplier)
      );
    } else {
      // Deterministic exponential (useful for testing)
      lastDelay = Math.min(maxDelay, baseDelay * multiplier ** (failures - 1));
    }

    return lastDelay;
  };

  const reset = () => {
    failures = 0;
    lastDelay = baseDelay;
  };

  const attempts = () => failures;

  return { next, reset, attempts };
};
