/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { $pendingTemplateNameConfirmation } from "~/shared/instance-utils/data";
import { TemplateNameConfirmationDialog } from "./template-name-confirmation-dialog";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  $pendingTemplateNameConfirmation.set(undefined);
  vi.unstubAllGlobals();
});

test.each([
  { action: "rename" as const, title: "Rename template", confirm: "Rename" },
  { action: "delete" as const, title: "Delete template", confirm: "Delete" },
])("shows exact $action actions and aborts accessibly", (expected) => {
  act(() => {
    $pendingTemplateNameConfirmation.set({
      operation:
        expected.action === "rename"
          ? {
              id: "instances.setLabel",
              input: { instanceId: "card", label: "Hero Card" },
            }
          : { id: "instances.delete", input: { instanceIds: ["card"] } },
      confirmation: {
        action: expected.action,
        templates: [{ instanceId: "card", oldName: "Card" }],
      },
    });
    root.render(<TemplateNameConfirmationDialog />);
  });

  const dialog = document.body.querySelector('[role="dialog"]');
  expect(dialog?.getAttribute("aria-labelledby")).toBeTruthy();
  expect(dialog?.textContent).toContain(expected.title);
  expect(
    Array.from(dialog?.querySelectorAll("button") ?? [], (button) =>
      button.textContent?.trim()
    ).filter(Boolean)
  ).toEqual(["Abort", expected.confirm]);

  act(() => {
    Array.from(dialog?.querySelectorAll("button") ?? [])
      .find((button) => button.textContent === "Abort")
      ?.click();
  });
  expect($pendingTemplateNameConfirmation.get()).toBeUndefined();
});
