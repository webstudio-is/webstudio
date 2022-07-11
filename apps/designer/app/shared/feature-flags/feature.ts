import * as flags from "./flags";
import env from "~/shared/env";

type Name = keyof typeof flags;

const parse = (flags?: string | null): Array<Name> =>
  // Supports both, space and comma separated items
  (flags ?? "").split(/\s|,/).filter(Boolean) as Array<Name>;

const readLocal = (): Array<Name> => {
  try {
    const flags = localStorage.getItem("feature");
    return parse(flags);
  } catch (_error) {
    // Not having feature in localStorage or not having localStorage implemented, both should not throw.
  }
  return [];
};

/**
 * Returns true/false if the feature is turned on.
 * A feature can be turned on:
 * - by default directly in ./flags
 * - by providing an environment variable server-side (locally or on the server): FEATURE="something1, something2" yarn dev
 * - by setting it in the browser console: localStorage.feature = 'something1, something2', browser defined flag will override server-side flag
 */
export const isFeatureEnabled = (name: Name): boolean => {
  const defaultValue = flags[name];
  const envValue = parse(env.FEATURE).includes(name);
  const localValue = readLocal().includes(name);
  return localValue ?? envValue ?? defaultValue;
};
