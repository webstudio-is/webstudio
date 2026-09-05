// Verifies that the slash menu does not retain invisible editor state when no
// Content Block template can be inserted at the current position.
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type Instance,
} from "@webstudio-is/sdk";
import {
  $registeredComponentMetas,
  $textEditorContextMenu,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import { $instances, $props } from "~/shared/sync/data-stores";
import { TextEditorContextMenu } from "./block-editor-context-menu";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  $textEditorContextMenu.set(undefined);
  $textEditingInstanceSelector.set(undefined);
  $instances.set(new Map());
  $props.set(new Map());
  $registeredComponentMetas.set(new Map());
});

test("closes the editor menu when every template is structural-only", async () => {
  const createInstance = (
    id: string,
    component: string,
    children: Instance["children"] = []
  ): Instance => ({ type: "instance", id, component, children });
  const instances = new Map<Instance["id"], Instance>([
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
        { type: "id", value: "list-item" },
      ]),
    ],
    [
      "list-item",
      {
        ...createInstance("list-item", elementComponent),
        tag: "li",
      },
    ],
    ["current", { ...createInstance("current", elementComponent), tag: "p" }],
  ]);
  $instances.set(instances);
  $textEditingInstanceSelector.set({
    selector: ["current", "block"],
    reason: "left",
  });
  $textEditorContextMenu.set({ cursorRect: new DOMRect() });
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<TextEditorContextMenu />);
  });

  expect($textEditorContextMenu.get()).toBeUndefined();
});
