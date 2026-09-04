import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type Instance,
} from "@webstudio-is/sdk";
import {
  $textEditorContextMenu,
  $textEditingInstanceSelector,
  selectInstance,
} from "~/shared/nano-states";
import { $instances, $props } from "~/shared/sync/data-stores";
import { TextEditor } from "./text-editor";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  document.body.innerHTML = "";
  $textEditingInstanceSelector.set(undefined);
  $textEditorContextMenu.set(undefined);
  selectInstance(undefined);
  $instances.set(new Map());
  $props.set(new Map());
});

describe("TextEditor", () => {
  test("focuses the editable element when initializing a new empty instance", async () => {
    const instance: Instance = {
      type: "instance",
      id: "list-item",
      component: elementComponent,
      tag: "li",
      children: [],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    $textEditingInstanceSelector.set({
      selector: [instance.id],
      reason: "new",
    });

    await act(async () => {
      root?.render(
        <TextEditor
          rootInstanceSelector={[instance.id]}
          instances={new Map([[instance.id, instance]])}
          props={new Map()}
          contentEditable={<ContentEditable />}
          onChange={() => {}}
          onSelectInstance={() => {}}
        />
      );
    });

    const editable = container.querySelector<HTMLElement>(
      "[data-lexical-editor]"
    );
    expect(editable).not.toBeNull();
    expect(document.activeElement).toBe(editable);
    expect(editable?.contains(window.getSelection()?.anchorNode ?? null)).toBe(
      true
    );
  });

  test("does not save the active slash-menu trigger on blur", async () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "block",
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [
            { type: "id", value: "templates" },
            { type: "id", value: "current" },
          ],
        },
      ],
      [
        "templates",
        {
          type: "instance",
          id: "templates",
          component: blockTemplateComponent,
          children: [{ type: "id", value: "template" }],
        },
      ],
      [
        "template",
        {
          type: "instance",
          id: "template",
          component: elementComponent,
          tag: "p",
          children: [],
        },
      ],
      [
        "current",
        {
          type: "instance",
          id: "current",
          component: elementComponent,
          tag: "p",
          children: [{ type: "text", value: "Before" }],
        },
      ],
    ]);
    $instances.set(instances);
    selectInstance(["current", "block"]);
    $textEditingInstanceSelector.set({
      selector: ["current", "block"],
      reason: "left",
    });
    const onChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <TextEditor
          rootInstanceSelector={["current", "block"]}
          instances={instances}
          props={new Map()}
          contentEditable={<ContentEditable />}
          onChange={onChange}
          onSelectInstance={() => {}}
        />
      );
    });

    const editable = container.querySelector<HTMLElement>(
      "[data-lexical-editor]"
    );
    await act(async () => {
      editable?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "/", bubbles: true })
      );
    });
    expect(editable?.textContent).toBe("Before/");

    await act(async () => {
      editable?.dispatchEvent(new FocusEvent("blur"));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toContainEqual(
      expect.objectContaining({
        id: "current",
        children: [{ type: "text", value: "Before" }],
      })
    );
  });

  test("enables the slash menu when a template is added while editing", async () => {
    const current: Instance = {
      type: "instance",
      id: "current",
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: "Before" }],
    };
    const block: Instance = {
      type: "instance",
      id: "block",
      component: blockComponent,
      children: [
        { type: "id", value: "templates" },
        { type: "id", value: current.id },
      ],
    };
    const templates: Instance = {
      type: "instance",
      id: "templates",
      component: blockTemplateComponent,
      children: [],
    };
    const instances = new Map(
      [block, templates, current].map((instance) => [instance.id, instance])
    );
    $instances.set(instances);
    selectInstance([current.id, block.id]);
    $textEditingInstanceSelector.set({
      selector: [current.id, block.id],
      reason: "left",
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <TextEditor
          rootInstanceSelector={[current.id, block.id]}
          instances={instances}
          props={new Map()}
          contentEditable={<ContentEditable />}
          onChange={() => {}}
          onSelectInstance={() => {}}
        />
      );
    });

    const template: Instance = {
      type: "instance",
      id: "paragraph-template",
      component: elementComponent,
      tag: "p",
      label: "Paragraph",
      children: [],
    };
    await act(async () => {
      $instances.set(
        new Map([
          ...instances,
          [
            templates.id,
            { ...templates, children: [{ type: "id", value: template.id }] },
          ],
          [template.id, template],
        ])
      );
    });

    const editable = container.querySelector<HTMLElement>(
      "[data-lexical-editor]"
    );
    await act(async () => {
      editable?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "/", bubbles: true })
      );
    });
    expect($textEditorContextMenu.get()).toBeDefined();

    await act(async () => {
      $instances.set(new Map($instances.get()));
    });
    expect($textEditorContextMenu.get()).toBeDefined();
  });
});
