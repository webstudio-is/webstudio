import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import { getTagStyleId } from "@webstudio-is/sdk";
import {
  selectInstance,
  $selectedInstanceSelector,
  $selectedPageId,
  $selectedStyleSources,
  $selectedStyleState,
  $temporaryTagStyleId,
} from "~/shared/nano-states";
import {
  $breakpoints,
  $instances,
  $pages,
  $styleSources,
} from "~/shared/sync/data-stores";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { createAssetManagerTestRenderer } from "~/builder/shared/asset-manager/test-utils";
import { PropertyInfo, PropertyInlineLabel } from "./property-label";

const renderer = createAssetManagerTestRenderer();
afterEach(() => {
  renderer.cleanup();
  selectInstance(undefined);
  $selectedPageId.set(undefined);
  $pages.set(undefined);
  $instances.set(new Map());
  $styleSources.set(new Map());
  $breakpoints.set(new Map());
  $selectedStyleSources.set(new Map());
  $selectedStyleState.set(undefined);
  $temporaryTagStyleId.set(undefined);
});

test("nested source badge keeps a valid ancestor selection and is cascaded", async () => {
  const pages = createDefaultPages({ rootInstanceId: "container" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $instances.set(
    new Map([
      [
        "container",
        {
          type: "instance" as const,
          id: "container",
          component: "Box",
          children: [{ type: "id" as const, value: "heading" }],
        },
      ],
      [
        "heading",
        {
          type: "instance" as const,
          id: "heading",
          component: "Heading",
          children: [],
        },
      ],
    ])
  );
  const tagStyleId = getTagStyleId("div");
  $styleSources.set(
    new Map([[tagStyleId, { type: "tag", id: tagStyleId, tag: "div" }]])
  );
  $breakpoints.set(new Map([["base", { id: "base", label: "Base" }]]));
  selectInstance(["heading", "container"]);
  const value = { type: "keyword", value: "red" } as const;
  const styles: ComputedStyleDecl[] = [
    {
      property: "color",
      source: {
        name: "remote",
        instanceId: "container",
        styleSourceId: tagStyleId,
        breakpointId: "base",
        state: " h2:hover",
      },
      cascadedValue: value,
      computedValue: value,
      usedValue: value,
    },
  ];
  const container = renderer.render(
    <PropertyInfo
      title="Color"
      property="color"
      description=""
      styles={styles}
    />
  );

  const sourceButton = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.includes("div")
  );
  expect(sourceButton).toBeDefined();
  await act(async () => userEvent.click(sourceButton!));

  expect($selectedInstanceSelector.get()).toEqual(["container"]);
  expect($selectedStyleSources.get().get("container")).toBe(tagStyleId);
  expect($selectedStyleState.get()).toBe(" h2:hover");
  expect($temporaryTagStyleId.get()).toBe(tagStyleId);
  expect(container.textContent).toContain("Cascaded:");
  $instances.set(new Map($instances.get()));
  expect($selectedInstanceSelector.get()).toEqual(["container"]);
});

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
