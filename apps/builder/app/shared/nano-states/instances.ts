import { atom } from "nanostores";
import type { InstanceSelector } from "../tree-utils";
import { $instances } from "../sync/data-stores";

// Re-export for backward compatibility
export { $instances };

export const $isResizingCanvas = atom(false);

export const $selectedInstanceSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const $editingItemSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const $textEditingInstanceSelector = atom<
  | undefined
  | {
      selector: InstanceSelector;
      reason: "right" | "left" | "enter";
    }
  | {
      selector: InstanceSelector;
      reason: "new";
    }
  | {
      selector: InstanceSelector;
      reason: "click";
      mouseX: number;
      mouseY: number;
    }
  | {
      selector: InstanceSelector;
      reason: "up" | "down";
      cursorX: number;
    }
>();

export const $textEditorContextMenu = atom<
  | {
      cursorRect: DOMRect;
    }
  | undefined
>(undefined);

type ContextMenuCommand =
  | {
      type: "filter";
      value: string;
    }
  | { type: "selectNext" }
  | { type: "selectPrevious" }
  | { type: "enter" };

export const $textEditorContextMenuCommand = atom<
  undefined | ContextMenuCommand
>(undefined);

export const execTextEditorContextMenuCommand = (
  command: ContextMenuCommand
) => {
  $textEditorContextMenuCommand.set(command);
};
