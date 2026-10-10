import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import "../colors/colors.css";
import { Toaster, toast } from "./toast";
import { TooltipProvider } from "./tooltip";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  act(() => toast.dismiss());
  await new Promise((resolve) => setTimeout(resolve, 200));
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("Clear all appears below multiple visible toasts and dismisses them", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <TooltipProvider>
        <Toaster />
      </TooltipProvider>
    );
  });
  await act(async () => {
    toast.info("First notification");
    toast.info("Second notification");
  });
  await new Promise((resolve) => setTimeout(resolve, 300));

  const clearAll = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Clear all"
  );
  expect(clearAll).toBeDefined();

  const visibleToasts = Array.from(
    document.querySelectorAll<HTMLElement>('li[data-state="open"]')
  ).filter((item) =>
    ["First notification", "Second notification"].some((message) =>
      item.textContent?.includes(message)
    )
  );
  expect(visibleToasts).toHaveLength(2);
  const lastToastBottom = Math.max(
    ...visibleToasts.map((item) => item.getBoundingClientRect().bottom)
  );
  expect(clearAll!.getBoundingClientRect().top).toBeGreaterThanOrEqual(
    lastToastBottom
  );

  await act(async () => {
    await page.elementLocator(clearAll!).click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  });

  const remainingVisibleToasts = Array.from(
    document.querySelectorAll<HTMLElement>('li[data-state="open"]')
  ).filter((item) =>
    ["First notification", "Second notification"].some((message) =>
      item.textContent?.includes(message)
    )
  );
  expect(remainingVisibleToasts).toHaveLength(0);
});
