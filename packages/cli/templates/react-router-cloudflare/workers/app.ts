import { createRequestHandler } from "react-router";
// @ts-ignore - app files are provided by the react-router template
import { redirectRequest } from "../app/redirect-url";
// @todo think about how to make __generated__ typeable
// @ts-ignore
import { redirects } from "../app/__generated__/$resources.redirects";

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
    const redirectResponse = redirectRequest(request, redirects);
    if (redirectResponse !== undefined) {
      return redirectResponse;
    }

    return requestHandler(request, {
      EXCLUDE_FROM_SEARCH: false,
      getDefaultActionResource: undefined,
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
