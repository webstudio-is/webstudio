import { namespace } from "./namespace";
import type { Env } from "apps/designer/app/env.server";

// @todo remove once remix has a built-in way
// https://github.com/remix-run/remix/discussions/2769
// This provides an access to a config over window by accessing a property in an env proxy object
export default new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof window === "undefined") {
        return prop in process.env ? process.env[prop as keyof Env] : undefined;
      }
      const env = (window[namespace as never] ?? {}) as unknown as Env;
      return prop in env ? env[prop as keyof Env] : undefined;
    },
  }
) as Env;
