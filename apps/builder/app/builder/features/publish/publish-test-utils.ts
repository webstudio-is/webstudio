export const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

export const trpcFetch =
  (
    handlers: Record<string, (input: unknown) => unknown | Promise<unknown>>,
    onRequest?: (route: string, input: unknown) => void
  ) =>
  async (requestInfo: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(requestInfo), location.href);
    const input = JSON.parse(
      init?.body === undefined
        ? (url.searchParams.get("input") ?? "{}")
        : String(init.body)
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
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  };
