import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import { createAssetManagerTestRenderer } from "~/builder/shared/asset-manager/test-utils";
import { PropertyInlineLabel } from "./property-label";

const renderer = createAssetManagerTestRenderer();
afterEach(renderer.cleanup);

test("inline property labels offer keyboard-accessible information without a reset action", async () => {
  const container = renderer.render(
    <TooltipProvider>
      <PropertyInlineLabel
        label="Position"
        title="Background position"
        properties={["background-position-x", "background-position-y"]}
        description="Position within this background layer."
      />
      <button>Next control</button>
    </TooltipProvider>
  );
  const label = container.querySelector("button")!;
  await act(async () => userEvent.tab());
  expect(document.activeElement).toBe(label);
  await act(async () => userEvent.keyboard("{Enter}"));
  const tooltip = document.querySelector(
    "[data-radix-popper-content-wrapper]"
  )!;
  expect(tooltip).not.toBeNull();
  // The property names identify the information associated with this control.
  expect(tooltip.textContent).toContain("background-position-x");
  expect(tooltip.textContent).toContain("background-position-y");
  expect(tooltip.querySelector("button")).toBeNull();
});
