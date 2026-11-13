import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  blockComponent,
  contentBlockSourceProp,
  coreMetas,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import {
  $authPermit,
  $registeredComponentMetas,
  selectInstance,
} from "~/shared/nano-states";
import { $instances, $props } from "~/shared/sync/data-stores";
import { PropertyLabel } from "./property-label";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const block: Instance = {
  type: "instance",
  id: "block",
  component: blockComponent,
  children: [],
};
const source: Prop = {
  id: "source",
  instanceId: block.id,
  name: contentBlockSourceProp,
  type: "asset",
  value: "asset",
};

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
  $instances.set(new Map([[block.id, block]]));
  $props.set(new Map([[source.id, source]]));
  $registeredComponentMetas.set(new Map(Object.entries(coreMetas)));
  $authPermit.set("build");
  selectInstance([block.id]);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  selectInstance(undefined);
  $instances.set(new Map());
  $props.set(new Map());
  $registeredComponentMetas.set(new Map());
  $authPermit.set("view");
  vi.unstubAllGlobals();
});

test("uses the deletion override for tooltip reset and Alt-click", () => {
  const onDelete = vi.fn();
  act(() => {
    root.render(
      <TooltipProvider>
        <PropertyLabel name={contentBlockSourceProp} onDelete={onDelete} />
      </TooltipProvider>
    );
  });

  const label = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  ).find((element) => element.textContent === "Source");
  if (label === undefined) {
    throw new Error("Expected Source property label");
  }

  act(() => label.click());
  const reset = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent?.includes("Reset value"));
  if (reset === undefined) {
    throw new Error("Expected Reset value action");
  }
  act(() => reset.click());
  expect(onDelete).toHaveBeenCalledOnce();

  act(() =>
    label.dispatchEvent(
      new MouseEvent("click", { altKey: true, bubbles: true })
    )
  );
  expect(onDelete).toHaveBeenCalledTimes(2);
});
