import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { $authPermit, $builderMode, $planFeatures } from "~/shared/nano-states";
import { BuilderModeDropDown } from "./builder-mode";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  $authPermit.set("view");
  $planFeatures.set(defaultPlanFeatures);
});

const openModeMenu = async () => {
  $builderMode.set("design");
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <BuilderModeDropDown />
      </TooltipProvider>
    )
  );
  await act(async () =>
    userEvent.click(
      container.querySelector('button[aria-label="Choose mode"]')!
    )
  );
  return Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
  ).find((item) => item.textContent?.includes("Content"));
};

test("shows Content as a disabled Pro option on an owned free project", async () => {
  $authPermit.set("own");
  $planFeatures.set(defaultPlanFeatures);

  const contentItem = await openModeMenu();

  expect(contentItem).toBeDefined();
  expect(contentItem?.hasAttribute("data-disabled")).toBe(true);
  expect(contentItem?.textContent).toContain("Pro");
  expect(contentItem?.querySelector("kbd")).toBeNull();
});

test("shows the shortcut without the Pro badge when Content is allowed", async () => {
  $authPermit.set("own");
  $planFeatures.set({ ...defaultPlanFeatures, allowContentMode: true });

  const contentItem = await openModeMenu();

  expect(contentItem).toBeDefined();
  expect(contentItem?.hasAttribute("data-disabled")).toBe(false);
  expect(contentItem?.querySelector("kbd")).not.toBeNull();
  expect(contentItem?.textContent).not.toContain("Pro");
});

test("keeps Content enabled on a shared free project", async () => {
  $authPermit.set("build");
  $planFeatures.set(defaultPlanFeatures);

  const contentItem = await openModeMenu();

  expect(contentItem).toBeDefined();
  expect(contentItem?.hasAttribute("data-disabled")).toBe(false);
  expect(contentItem?.querySelector("kbd")).not.toBeNull();
});
