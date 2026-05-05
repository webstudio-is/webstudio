/**
 * Incremental backoff with decorrelated jitter.
 *
 * Produces progressively longer delays after consecutive failures,
 * capped at a configurable maximum. Uses decorrelated jitter
 * (delay = random(base, prev * multiplier)) to prevent thundering-herd
 * when many clients retry simultaneously after a shared outage.
 *
 * The backoff is a pure, stateful object with no timers or side effects.
 * Call `next()` to get the next delay, and `reset()` after a success.
 */

export type BackoffOptions = {
  /**
   * Base delay in milliseconds.
   * @default 5_000
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds.
   * @default 120_000
   */
  maxDelay?: number;

  /**
   * Growth factor applied to the previous delay on each failure.
   * @default 3
   */
  multiplier?: number;

  /**
   * When true, randomize delays between baseDelay and previousDelay * multiplier.
   * @default true
   */
  jitter?: boolean;
};

export type Backoff = {
  next: () => number;
  reset: () => void;
  attempts: () => number;
};

const DEFAULT_BASE_DELAY = 5_000;
const DEFAULT_MAX_DELAY = 120_000;
const DEFAULT_MULTIPLIER = 3;

const randomBetween = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export const createBackoff = (options?: BackoffOptions): Backoff => {
  const {
    baseDelay = DEFAULT_BASE_DELAY,
    jitter = true,
    maxDelay = DEFAULT_MAX_DELAY,
    multiplier = DEFAULT_MULTIPLIER,
  } = options ?? {};

  let failures = 0;
  let lastDelay = baseDelay;

  const next = () => {
    failures += 1;

    if (jitter) {
      lastDelay = Math.min(
        maxDelay,
        randomBetween(baseDelay, lastDelay * multiplier)
      );
      return lastDelay;
    }

    lastDelay = Math.min(maxDelay, baseDelay * multiplier ** (failures - 1));
    return lastDelay;
  };

  const reset = () => {
    failures = 0;
    lastDelay = baseDelay;
  };

  return {
    attempts: () => failures,
    next,
    reset,
  };
};
