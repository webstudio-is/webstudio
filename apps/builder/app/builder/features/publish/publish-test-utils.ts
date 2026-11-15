import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { userEvent } from "@vitest/browser/context";
import { act } from "react-dom/test-utils";
import { expect } from "vitest";

export const selectTab = async (name: string) => {
  const tab = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((candidate) => candidate.textContent?.startsWith(name));
  expect(tab).toBeDefined();
  await act(async () => userEvent.click(tab!));
};

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
