import { namespace } from "./namespace";
import type { Env } from "~/env.server";

// @todo remove once remix has a built-in way
// https://github.com/remix-run/remix/discussions/2769
// This provides an access to a config over window by accessing a property in an env proxy object
export default new Proxy(
  {},
  {
    get(_target, prop) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = (window[namespace as any] ?? {}) as unknown as Env;
      return prop in env ? env[prop as keyof Env] : undefined;
    },
  }
) as Env;
