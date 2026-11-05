import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { coreMetas, elementComponent, type Instance } from "@webstudio-is/sdk";
import { TooltipProvider } from "@webstudio-is/design-system";
import { showAttribute } from "@webstudio-is/react-sdk";
import {
  $allSelectedInstanceSelectors,
  $dragAndDropState,
  $propValuesByInstanceSelector,
  $selectedPageId,
  $registeredComponentMetas,
  getInstanceKey,
  selectInstance,
} from "~/shared/nano-states";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { NavigatorTree } from "./navigator-tree";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("large Navigator selection and reorder leave unchanged labels alone", async () => {
  const count = 2000;
  let labelReads = 0;
  const previousMetas = $registeredComponentMetas.get();
  $registeredComponentMetas.set(new Map(Object.entries(coreMetas)));
  const children = Array.from({ length: count }, (_, index) => ({
    type: "id" as const,
    value: `child-${index}`,
  }));
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
          tag: "body",
          children,
        },
      ],
      ...children.map(({ value }): [string, Instance] => [
        value,
        {
          type: "instance",
          id: value,
          component: elementComponent,
          tag: "div",
          children: [],
          get label() {
            labelReads += 1;
            return value;
          },
        },
      ]),
    ])
  );
  $selectedPageId.set("home");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    const startRender = performance.now();
    act(() =>
      root.render(
        <TooltipProvider>
          <NavigatorTree />
        </TooltipProvider>
      )
    );
    const renderMs = performance.now() - startRender;
    expect(
      container.querySelectorAll("[data-tree-button]").length
    ).toBeGreaterThan(count);
    labelReads = 0;
    const startSelect = performance.now();
    act(() => selectInstance(["child-1000", "body"]));
    const selectMs = performance.now() - startSelect;
    const selectionLabelReads = labelReads;
    labelReads = 0;
    const startReorder = performance.now();
    act(() => {
      $instances.set(
        new Map($instances.get()).set("body", {
          ...$instances.get().get("body")!,
          children: [children.at(-1)!, ...children.slice(0, -1)],
        })
      );
    });
    const reorderMs = performance.now() - startReorder;
    console.info({
      count,
      renderMs,
      selectMs,
      reorderMs,
      selectionLabelReads,
      reorderLabelReads: labelReads,
    });
    expect.soft(selectionLabelReads).toBeLessThan(10);
    expect.soft(labelReads).toBe(0);

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-tree-button]")
    );
    const selected = buttons.find(
      (button) => button.getAttribute("aria-selected") === "true"
    )!;
    expect(selected.textContent).toBe("child-1000");
    expect(buttons[2].textContent).toBe("child-1999");

    const sibling = buttons.find(
      (button) => button.textContent === "child-1001"
    )!;
    act(() => {
      sibling.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          ctrlKey: true,
        })
      );
    });
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["child-1000", "body"],
      ["child-1001", "body"],
    ]);
    expect(sibling.getAttribute("aria-selected")).toBe("true");
    act(() => {
      sibling.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "ArrowDown",
          shiftKey: true,
        })
      );
    });
    expect($allSelectedInstanceSelectors.get()).toHaveLength(3);
    expect(document.activeElement?.textContent).toBe("child-1002");

    // A prop evaluation refresh also recreates the flat tree.
    act(() => selectInstance(["child-1000", "body"]));
    labelReads = 0;
    act(() => $propValuesByInstanceSelector.set(new Map()));
    expect.soft(labelReads).toBe(0);

    // Native drag targeting must use the new sibling index after a reorder.
    const target = buttons[2].closest<HTMLElement>(
      "[data-tree-sortable-item]"
    )!;
    const source = sibling.closest<HTMLElement>("[data-tree-sortable-item]")!;
    const dataTransfer = new DataTransfer();
    const rect = target.getBoundingClientRect();
    act(() => {
      source.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, dataTransfer })
      );
      target.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          dataTransfer,
          clientX: rect.left + 1,
          clientY: rect.top + 1,
        })
      );
    });
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    );
    act(() => {
      target.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          dataTransfer,
          clientX: rect.left + 1,
          clientY: rect.top + 1,
        })
      );
    });
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    );
    expect($dragAndDropState.get().dropTarget?.indexWithinChildren).toBe(0);
    act(() =>
      source.dispatchEvent(
        new DragEvent("dragend", { bubbles: true, dataTransfer })
      )
    );

    // Row content must still update when its instance or visibility changes.
    act(() => {
      const instances = new Map($instances.get());
      instances.set("child-1001", {
        ...instances.get("child-1001")!,
        label: "Renamed child",
      });
      $instances.set(instances);
    });
    expect(sibling.textContent).toBe("Renamed child");
    act(() =>
      $propValuesByInstanceSelector.set(
        new Map([
          [
            getInstanceKey(["child-1001", "body"]),
            new Map([[showAttribute, false]]),
          ],
        ])
      )
    );
    expect(sibling.parentElement?.style.opacity).toBe("0.4");
  } finally {
    act(() => root.unmount());
    container.remove();
    selectInstance(undefined);
    $selectedPageId.set(undefined);
    $pages.set(undefined);
    $instances.set(new Map());
    $registeredComponentMetas.set(previousMetas);
    $dragAndDropState.set({ isDragging: false });
  }
});
