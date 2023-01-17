import { namespace } from "./namespace";

// @todo remove once remix has a built-in way
// https://github.com/remix-run/remix/discussions/2769
// This provides an access to a config over window by accessing a property in an env proxy object
export default new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (typeof window === "undefined") {
        return prop in process.env ? process.env[prop] : undefined;
      }
      const env = window[namespace as unknown as number] ?? {};
      return prop in env ? env[prop as unknown as number] : undefined;
    },
  }
);
