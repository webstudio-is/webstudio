import { FetchInterceptor } from "@mswjs/interceptors/fetch";

type Handlers = Record<string, (input: unknown) => unknown>;

export const createTrpcInterceptor = (
  { GET = {}, POST = {} }: { GET?: Handlers; POST?: Handlers },
  onRequest?: (route: string, input: unknown) => void
) => {
  const interceptor = new FetchInterceptor();
  const unexpectedRequests: string[] = [];
  interceptor.on("request", async ({ request, controller }) => {
    const url = new URL(request.url);
    if (url.origin !== location.origin || !url.pathname.startsWith("/trpc/")) {
      return;
    }
    const rejectRequest = (message: string) => {
      unexpectedRequests.push(message);
      controller.errorWith(new Error(message));
    };
    if (url.searchParams.get("batch") !== "1") {
      rejectRequest(`Unexpected request batch: ${url.pathname}`);
      return;
    }
    if (request.method !== "GET" && request.method !== "POST") {
      rejectRequest(
        `Unexpected request method: ${request.method} ${url.pathname}`
      );
      return;
    }
    const handlers = request.method === "GET" ? GET : POST;
    const routes = url.pathname.slice("/trpc/".length).split(",");
    for (const route of routes) {
      if (Object.hasOwn(handlers, route)) {
        continue;
      }
      if (Object.hasOwn(GET, route) || Object.hasOwn(POST, route)) {
        rejectRequest(`Unexpected request method: ${request.method} ${route}`);
        return;
      }
      rejectRequest(`Unexpected request: ${route}`);
      return;
    }
    let input: Record<string, unknown>;
    try {
      const parsedInput: unknown = JSON.parse(
        request.method === "GET"
          ? (url.searchParams.get("input") ?? "{}")
          : await request.clone().text()
      );
      if (
        parsedInput === null ||
        typeof parsedInput !== "object" ||
        Array.isArray(parsedInput)
      ) {
        throw new Error("Invalid tRPC batch envelope");
      }
      input = parsedInput as Record<string, unknown>;
    } catch (error) {
      unexpectedRequests.push(`Unexpected request input: ${url.pathname}`);
      controller.errorWith(error);
      return;
    }
    try {
      const results = await Promise.all(
        routes.map(async (route, index) => {
          const value = input[String(index)];
          onRequest?.(route, value);
          return handlers[route](value);
        })
      );
      const response = results.find((result) => result instanceof Response);
      if (response !== undefined) {
        if (results.length !== 1) {
          rejectRequest(`Unexpected batched HTTP response: ${url.pathname}`);
          return;
        }
        controller.respondWith(response);
        return;
      }
      controller.respondWith(
        new Response(
          JSON.stringify(results.map((data) => ({ result: { data } }))),
          {
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    } catch (error) {
      controller.errorWith(error);
    }
  });
  return {
    start: () => interceptor.apply(),
    stop: () => {
      interceptor.dispose();
      if (unexpectedRequests.length > 0) {
        throw new Error(unexpectedRequests.join("\n"));
      }
    },
  };
};
