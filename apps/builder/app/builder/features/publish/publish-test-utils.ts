import { act } from "react-dom/test-utils";
import { expect, vi } from "vitest";

export const createPublishAuditFinding = (
  message: string,
  severity: "error" | "warning" = "error"
) => ({
  ruleId: "test-rule",
  severity,
  message,
  location: {},
});

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
  // Typeahead selects from Radix's closed collection without a blur-sensitive menu.
  await act(async () =>
    destination.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "s" })
    )
  );
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
