import type { Browser, BrowserContext, Page } from "playwright";
import { expect, test, vi } from "vitest";
import {
  createBrowserScopeForBrowser,
  getBrowserLaunchOptions,
  newPage,
} from "./harness";

test("maps Builder and project wstd.dev hosts to loopback for local browser runs", () => {
  expect(getBrowserLaunchOptions("https://127.0.0.1:5174")).toMatchObject({
    args: [
      "--host-resolver-rules=MAP wstd.dev 127.0.0.1,MAP *.wstd.dev 127.0.0.1",
    ],
  });
});

test("does not override host resolution for non-loopback Builder URLs", () => {
  expect(getBrowserLaunchOptions("https://builder.example.com")).toEqual({});
});

test("keeps timed-out work on its closed context after a scope reset", async () => {
  const contexts: Array<{
    closed: boolean;
    context: BrowserContext;
    page: Page;
  }> = [];
  const browser = {
    newContext: vi.fn(async () => {
      const record = {
        closed: false,
        page: {} as Page,
        context: undefined as unknown as BrowserContext,
      };
      record.context = {
        newPage: vi.fn(async () => {
          if (record.closed) {
            throw new Error("context closed");
          }
          return record.page;
        }),
        close: vi.fn(async () => {
          record.closed = true;
        }),
      } as unknown as BrowserContext;
      contexts.push(record);
      return record.context;
    }),
  } as Pick<Browser, "newContext">;
  const scope = await createBrowserScopeForBrowser(browser);
  let continueTimedOutWork: (() => void) | undefined;
  const timedOutWork = scope.run(async () => {
    await new Promise<void>((resolve) => {
      continueTimedOutWork = resolve;
    });
    return await newPage();
  });

  await scope.reset();
  continueTimedOutWork?.();

  await expect(timedOutWork).rejects.toThrow("context closed");
  await expect(scope.run(newPage)).resolves.toBe(contexts[1]?.page);
  expect(contexts[0]?.closed).toBe(true);
  await scope.close();
});
