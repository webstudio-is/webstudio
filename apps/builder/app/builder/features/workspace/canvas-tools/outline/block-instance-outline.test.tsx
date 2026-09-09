// Verifies pointer interaction for the Content Block template menu while the
// canvas editor deliberately retains DOM focus.
import { useEffect, useState } from "react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { userEvent } from "@vitest/browser/context";
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
  const onOpenChange = vi.fn();
  const canvas = document.createElement("iframe");
  document.body.appendChild(canvas);
  const canvasDocument = canvas.contentDocument;
  if (canvasDocument === null) {
    throw new Error("Expected the canvas document");
  }
  const editor = canvasDocument.createElement("input");
  editor.setAttribute("aria-label", "Editor");
  canvasDocument.body.appendChild(editor);
  editor.focus();
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  const Harness = () => {
    const [open, setOpen] = useState(true);
    const [inert, setInert] = useState(true);
    const [value, setValue] = useState<string[] | undefined>(firstSelector);
    useEffect(() => {
      const timeout = setTimeout(() => setInert(false), 0);
      return () => clearTimeout(timeout);
    }, []);
    return (
      <TooltipProvider>
        <TemplatesMenu
          open={open}
          onOpenChange={(nextOpen) => {
            onOpenChange(nextOpen);
            setOpen(nextOpen);
          }}
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
          inert={inert}
          preventFocusOnHover={true}
        >
          <button>Templates</button>
        </TemplatesMenu>
      </TooltipProvider>
    );
  };

  await act(async () => {
    root?.render(<Harness />);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });

  let items = document.querySelectorAll<HTMLElement>('[role="menuitemradio"]');
  expect(items).toHaveLength(2);
  expect(document.activeElement).toBe(canvas);
  expect(canvasDocument.activeElement).toBe(editor);

  await act(async () => {
    items[1]?.dispatchEvent(
      new PointerEvent("pointerover", {
        bubbles: true,
        pointerType: "mouse",
      })
    );
  });
  items = document.querySelectorAll<HTMLElement>('[role="menuitemradio"]');
  expect(items[1]?.hasAttribute("data-highlighted")).toBe(true);
  expect(document.activeElement).toBe(canvas);
  expect(canvasDocument.activeElement).toBe(editor);

  if (items[1] === undefined) {
    throw new Error("Expected the second menu item");
  }
  await act(async () => {
    await userEvent.click(items[1]);
  });

  expect(onValueChangeComplete).toHaveBeenCalledExactlyOnceWith(secondSelector);
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(document.querySelectorAll('[role="menuitemradio"]')).toHaveLength(0);
  expect(document.activeElement).toBe(canvas);
  expect(canvasDocument.activeElement).toBe(editor);
});
