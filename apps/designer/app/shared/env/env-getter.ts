import { namespace } from "./namespace";
import type { PublicEnv } from "~/env/env.public";

// @todo remove once remix has a built-in way
// https://github.com/remix-run/remix/discussions/2769
// This provides an access to a config over window by accessing a property in an env proxy object
export default new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof window === "undefined") {
        // We use process.env here instead of `import publicEnv from "~/env/env.public";` because
        // on a client side import above would break the client (no process.env on a client)
        return prop in process.env
          ? process.env[prop as keyof PublicEnv]
          : undefined;
      }
      const env = (window[namespace as never] ?? {}) as unknown as PublicEnv;
      return prop in env ? env[prop as keyof PublicEnv] : undefined;
    },
  }
) as PublicEnv;
