import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  // @ts-ignore
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      EXCLUDE_FROM_SEARCH: false,
      getDefaultActionResource: undefined,
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
