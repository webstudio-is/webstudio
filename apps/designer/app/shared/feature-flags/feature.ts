import debug from "debug";
import * as flags from "./flags";

type FeatureName = keyof typeof flags;

/**
 * Returns true/false if the feature is turned on.
 * A feature can be turned on:
 * - by default directly in ./values
 * - by providing an environment variable server-side (locally or on the server): DEBUG="feature:something1, feature:something2" yarn dev
 * - by setting it in the browser console: localStorage.debug = 'feature:something1, feature:something2', browser defined flag will override server-side flag
 */
export const feature = (name: FeatureName): boolean => {
  const defaultValue = flags[name];
  const runtimeValue = debug.enabled(`feature:${name}`);
  return Boolean(runtimeValue ?? defaultValue);
};
