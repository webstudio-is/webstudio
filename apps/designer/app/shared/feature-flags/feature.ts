import * as flags from "./flags";
import env from "~/shared/env";

type Name = keyof typeof flags;

const parse = (flags?: string | null): Array<Name> =>
  // Supports both, space and comma separated items
  (flags ?? "").split(/\s|,/).filter(Boolean) as Array<Name>;

const readLocal = (): Array<Name> => {
  try {
    const flags = localStorage.getItem("features");
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
 * - by providing an environment variable server-side (locally or on the server): FEATURES="something1, something2" pnpm dev
 * - by setting it in the browser console: localStorage.features = 'something1, something2', browser defined flag will override server-side flag
 */
export const isFeatureEnabled = (name: Name): boolean => {
  if (env.FEATURES === "*") {
    return true;
  }
  const defaultValue = flags[name];
  const envValue = parse(env.FEATURES).includes(name);
  const localValue = readLocal().includes(name);
  // Any source can enable feature, first `true` value will result in enabling a feature.
  // This also means you can't disable a feature if its already enabled in default value.
  return localValue || envValue || defaultValue;
};
