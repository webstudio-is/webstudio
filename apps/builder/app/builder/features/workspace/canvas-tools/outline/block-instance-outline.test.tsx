import { useState } from "react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type Instance,
} from "@webstudio-is/sdk";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $instances } from "~/shared/sync/data-stores";
import { TemplatesMenu } from "./block-instance-outline";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  $instances.set(new Map());
});

test("supports mouse hover and selection while preserving editor focus", async () => {
  const createInstance = (
    id: string,
    component: string,
    children: Instance["children"] = []
  ): Instance => ({ type: "instance", id, component, children });
  const first = createInstance("first", elementComponent);
  const second = createInstance("second", elementComponent);
  $instances.set(
    new Map([
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates" },
          { type: "id", value: "current" },
        ]),
      ],
      [
        "templates",
        createInstance("templates", blockTemplateComponent, [
          { type: "id", value: first.id },
          { type: "id", value: second.id },
        ]),
      ],
      [first.id, first],
      [second.id, second],
      ["current", createInstance("current", elementComponent)],
    ])
  );
  const firstSelector = [first.id, "templates", "block"];
  const secondSelector = [second.id, "templates", "block"];
  const onValueChangeComplete = vi.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  const Harness = () => {
    const [value, setValue] = useState<string[] | undefined>(firstSelector);
    return (
      <TooltipProvider>
        <TemplatesMenu
          open={true}
          onOpenChange={() => {}}
          anchor={["current", "block"]}
          triggerTooltipContent={<>Templates</>}
          templates={[
            [first, firstSelector],
            [second, secondSelector],
          ]}
          value={value}
          onValueChange={setValue}
          onValueChangeComplete={onValueChangeComplete}
          modal={false}
          inert={false}
          preventFocusOnHover={true}
        >
          <button>Templates</button>
        </TemplatesMenu>
      </TooltipProvider>
    );
  };

  await act(async () => {
    root?.render(<Harness />);
  });

  const items = document.querySelectorAll<HTMLElement>(
    '[role="menuitemradio"]'
  );
  expect(items).toHaveLength(2);

  await act(async () => {
    items[1]?.dispatchEvent(
      new PointerEvent("pointerover", {
        bubbles: true,
        pointerType: "mouse",
      })
    );
  });
  expect(items[1]?.hasAttribute("data-highlighted")).toBe(true);

  act(() => {
    items[1]?.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
      })
    );
    items[1]?.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
      })
    );
  });

  expect(onValueChangeComplete).toHaveBeenCalledWith(secondSelector);
});
