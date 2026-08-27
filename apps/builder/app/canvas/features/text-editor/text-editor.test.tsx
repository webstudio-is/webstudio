import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { elementComponent, type Instance } from "@webstudio-is/sdk";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
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
});
