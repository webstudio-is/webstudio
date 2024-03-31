import { useLoaderData } from "@remix-run/react";
import { namespace } from "./namespace";
import type { PublicEnv } from "~/env/env.public.server";

declare global {
  interface Window {
    [namespace]: Partial<PublicEnv> | undefined;
  }
}

// @todo remove once remix has a built-in way
// https://github.com/remix-run/remix/discussions/2769
// This renders env config as a script tag so we can have access to it before any scripts run
export const Env = () => {
  const data = useLoaderData<{ env: unknown }>();
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window["${namespace}"] = ${JSON.stringify(data.env)}`,
      }}
    />
  );
};

// For stories
export const setMockEnv = (env: Partial<PublicEnv>) => {
  window[namespace] = env;
};
