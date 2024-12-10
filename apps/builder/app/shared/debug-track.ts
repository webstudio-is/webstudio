import { shallowEqual } from "shallow-equal";
import warnOnce from "warn-once";

const trackers: Record<string, (args: Record<string, unknown>) => void> = {};

/**
 * Debug-only: Tracks changes between consecutive calls.
 * Usage: `track('label')({ a, b, c })` logs changed keys on subsequent calls.
 */
export const trackChanges = (label: string) => {
  if (process.env.NODE_ENV !== "development") {
    warnOnce(true, "track should not be used in production");
    return () => {};
  }

  if (!trackers[label]) {
    let previousArgs: Record<string, unknown> | undefined;

    trackers[label] = (currentArgs: Record<string, unknown>) => {
      if (!previousArgs) {
        previousArgs = currentArgs;
        return;
      }

      if (!shallowEqual(previousArgs, currentArgs)) {
        const changedKeys = Object.keys(currentArgs).filter(
          (key) => previousArgs![key] !== currentArgs[key]
        );
        console.info(label, changedKeys);
        previousArgs = currentArgs;
      }
    };
  }

  return trackers[label];
};
