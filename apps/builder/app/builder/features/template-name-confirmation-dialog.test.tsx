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

const showDialog = (action: "rename" | "delete") => {
  act(() => {
    $pendingTemplateNameConfirmation.set({
      operation:
        action === "rename"
          ? {
              id: "instances.setLabel",
              input: { instanceId: "card", label: "Hero Card" },
            }
          : {
              id: "instances.delete",
              input: { instanceIds: ["card"] },
            },
      confirmation: {
        action,
        templates: [{ instanceId: "card", oldName: "Card" }],
      },
    });
    root.render(<TemplateNameConfirmationDialog />);
  });
};

test.each([
  { action: "rename" as const, title: "Rename template", confirm: "Rename" },
  { action: "delete" as const, title: "Delete template", confirm: "Delete" },
])("shows exact $action actions and aborts accessibly", (expected) => {
  showDialog(expected.action);
  const dialog = document.body.querySelector('[role="dialog"]');
  expect(dialog?.getAttribute("aria-labelledby")).toBeTruthy();
  expect(dialog?.textContent).toContain(expected.title);
  const buttons = Array.from(
    dialog?.querySelectorAll("button") ?? [],
    (button) => button.textContent
  ).filter(Boolean);
  expect(buttons).toEqual(["Abort", expected.confirm]);

  act(() => {
    const abort = Array.from(dialog?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent === "Abort"
    );
    abort?.click();
  });
  expect($pendingTemplateNameConfirmation.get()).toBeUndefined();
});
