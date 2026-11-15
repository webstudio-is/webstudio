import { FetchInterceptor } from "@mswjs/interceptors/fetch";

export const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

export const createTrpcInterceptor = (
  handlers: Record<string, (input: unknown) => unknown | Promise<unknown>>,
  onRequest?: (route: string, input: unknown) => void
) => {
  const interceptor = new FetchInterceptor();
  interceptor.on("request", async ({ request, controller }) => {
    const url = new URL(request.url);
    if (url.origin !== location.origin || !url.pathname.startsWith("/trpc/")) {
      return;
    }
    try {
      const input = JSON.parse(
        request.method === "GET"
          ? (url.searchParams.get("input") ?? "{}")
          : await request.clone().text()
      );
      const routes = url.pathname.slice("/trpc/".length).split(",");
      const results = await Promise.all(
        routes.map(async (route, index) => {
          const handler = handlers[route];
          if (handler === undefined) {
            throw new Error(`Unexpected request: ${route}`);
          }
          const value = input[String(index)];
          onRequest?.(route, value);
          return { result: { data: await handler(value) } };
        })
      );
      controller.respondWith(
        new Response(JSON.stringify(results), {
          headers: { "Content-Type": "application/json" },
        })
      );
    } catch (error) {
      controller.errorWith(error);
    }
  });
  return {
    start: () => interceptor.apply(),
    stop: () => interceptor.dispose(),
  };
};
