import { namespace } from "./namespace";
import publicEnv from "~/env/env.public.server";
import type { PublicEnv } from "~/env/env.public.server";

// @todo remove once remix has a built-in way
// https://github.com/remix-run/remix/discussions/2769
// This provides an access to a config over window by accessing a property in an env proxy object
export default new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof window === "undefined") {
        return prop in publicEnv
          ? publicEnv[prop as keyof PublicEnv]
          : undefined;
      }
      const env = (window[namespace as never] ?? {}) as unknown as PublicEnv;
      return prop in env ? env[prop as keyof PublicEnv] : undefined;
    },
  }
) as PublicEnv;
