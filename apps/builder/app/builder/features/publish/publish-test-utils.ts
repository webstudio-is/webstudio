import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { act } from "react-dom/test-utils";
import { expect, vi } from "vitest";

export const selectTab = async (name: string) => {
  const tab = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((candidate) => candidate.textContent?.startsWith(name));
  expect(tab).toBeDefined();
  await act(async () =>
    tab?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    )
  );
};

export const selectStaticDestination = async (container: HTMLElement) => {
  const popover = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[aria-controls][aria-expanded="true"]'
    )
  )
    .map((trigger) => {
      const contentId = trigger.getAttribute("aria-controls");
      return contentId === null ? null : document.getElementById(contentId);
    })
    .find(
      (content) =>
        content !== null &&
        content.querySelector('button[role="combobox"]') !== null
    );
  const scope = popover ?? container;
  const destination = await vi.waitFor(
    () => {
      const element = Array.from(
        scope.querySelectorAll<HTMLButtonElement>('button[role="combobox"]')
      ).find((candidate) => candidate.getClientRects().length > 0);
      expect(element).toBeDefined();
      return element!;
    },
    { timeout: 10_000 }
  );
  await act(async () =>
    destination.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
      })
    )
  );
  const staticOption = await vi.waitFor(
    () => {
      const contentId = destination.getAttribute("aria-controls");
      const content =
        contentId === null ? null : document.getElementById(contentId);
      const element = Array.from(
        content?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
      ).find(
        (option) =>
          option.textContent?.trim() === "Static" &&
          option.getClientRects().length > 0
      );
      expect(
        element,
        `Expected the export destination menu to show Static; trigger state is ${destination.dataset.state}`
      ).toBeDefined();
      return element!;
    },
    { timeout: 10_000 }
  );
  await act(async () => staticOption.click());
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
  const unexpectedRequests: string[] = [];
  interceptor.on("request", async ({ request, controller }) => {
    const url = new URL(request.url);
    if (url.origin !== location.origin || !url.pathname.startsWith("/trpc/")) {
      return;
    }
    if (request.method !== "GET" && request.method !== "POST") {
      const message = `Unexpected request method: ${request.method} ${url.pathname}`;
      unexpectedRequests.push(message);
      controller.errorWith(new Error(message));
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
    const routes = url.pathname.slice("/trpc/".length).split(",");
    const missingRoute = routes.find((route) => handlers[route] === undefined);
    if (missingRoute !== undefined) {
      const message = `Unexpected request: ${missingRoute}`;
      unexpectedRequests.push(message);
      controller.errorWith(new Error(message));
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
          const message = `Unexpected batched HTTP response: ${url.pathname}`;
          unexpectedRequests.push(message);
          controller.errorWith(new Error(message));
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
