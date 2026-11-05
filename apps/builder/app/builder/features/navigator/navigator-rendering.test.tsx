import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { coreMetas, elementComponent, type Instance } from "@webstudio-is/sdk";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  $allSelectedInstanceSelectors,
  $hoveredInstanceSelector,
  $registeredComponentMetas,
  $selectedPageId,
  selectInstance,
  selectInstances,
} from "~/shared/nano-states";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { NavigatorTree } from "./navigator-tree";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("reuses unrelated rows while selection and hover handlers stay current", () => {
  const previousMetas = $registeredComponentMetas.get();
  const reads = new Map<string, number>();
  const ids = ["first", "second", "third"];
  const metas = new Map(Object.entries(coreMetas));
  for (const id of ids) {
    metas.set(id, {
      ...coreMetas[elementComponent],
      // Count real row-content renders at the metadata boundary, without replacing modules.
      get label() {
        reads.set(id, (reads.get(id) ?? 0) + 1);
        return id;
      },
    });
  }
  $registeredComponentMetas.set(metas);
  $pages.set(
    createDefaultPages({ rootInstanceId: "body", homePageId: "home" })
  );
  $instances.set(
    new Map<string, Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: elementComponent,
          children: ids.map((value) => ({ type: "id", value })),
        },
      ],
      ...ids.map((id): [string, Instance] => [
        id,
        { type: "instance", id, component: id, children: [] },
      ]),
    ])
  );
  $selectedPageId.set("home");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() =>
      root.render(
        <TooltipProvider>
          <NavigatorTree />
        </TooltipProvider>
      )
    );
    act(() => selectInstance(["first", "body"]));
    reads.clear();
    act(() => selectInstance(["second", "body"]));
    expect(reads.get("third") ?? 0).toBe(0);
    expect(reads.get("second")).toBeGreaterThan(0);
    reads.clear();
    act(() => $hoveredInstanceSelector.set(["first", "body"]));
    expect(reads.get("third") ?? 0).toBe(0);
    expect(reads.get("first")).toBeGreaterThan(0);

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-tree-button]")
    );
    const third = buttons.find((button) => button.textContent === "third")!;
    act(() =>
      third.dispatchEvent(
        new MouseEvent("click", { bubbles: true, ctrlKey: true })
      )
    );
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["second", "body"],
      ["third", "body"],
    ]);
    const first = buttons.find((button) => button.textContent === "first")!;
    act(() =>
      first.dispatchEvent(
        new MouseEvent("click", { bubbles: true, shiftKey: true })
      )
    );
    expect($allSelectedInstanceSelectors.get()).toEqual(
      ids.map((id) => [id, "body"])
    );
    act(() => {
      const nextMetas = new Map($registeredComponentMetas.get());
      nextMetas.set("third", {
        ...nextMetas.get("third")!,
        label: "Updated component",
      });
      $registeredComponentMetas.set(nextMetas);
    });
    expect(third.textContent).toBe("Updated component");
  } finally {
    act(() => root.unmount());
    container.remove();
    selectInstances([]);
    $hoveredInstanceSelector.set(undefined);
    $selectedPageId.set(undefined);
    $pages.set(undefined);
    $instances.set(new Map());
    $registeredComponentMetas.set(previousMetas);
  }
});
