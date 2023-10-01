import { type Options, useHotkeys } from "react-hotkeys-hook";
import store from "immerhin";
import { deleteSelectedInstance } from "../instance-utils";
import {
  editingItemIdStore,
  selectedInstanceSelectorStore,
} from "../nano-states";
import { onCopy, onPaste } from "../copy-paste/plugin-instance";

export const shortcuts = {
  esc: "esc",
} as const;

export const options: Options = {
  enableOnFormTags: true,
};

export const useSharedShortcuts = ({
  source,
}: {
  source: "canvas" | "builder";
}) => {
  useHotkeys(
    // safari use cmd+z to reopen closed tabs so fallback to ctrl
    "meta+z, ctrl+z",
    () => store.undo(),
    {
      // prevents undoing when user is editing text in a control on style panel etc.
      enableOnFormTags: source === "canvas",
      enableOnContentEditable: false,
    },
    []
  );

  useHotkeys(
    // safari use cmd+shift+z to close reopened tabs so fallback to ctrl
    "meta+shift+z, ctrl+shift+z",
    () => store.redo(),
    {
      // prevents undoing when user is editing text in a control on style panel etc.
      enableOnFormTags: source === "canvas",
      enableOnContentEditable: false,
    },
    []
  );

  useHotkeys(
    "backspace, delete",
    deleteSelectedInstance,
    {
      // When in builder, we don't want to delete instances,
      // when user edits text in a control on style panel etc.
      // But when a form control on canvas has focus, we want the shortcut to work.
      enableOnFormTags: source === "canvas",
      enableOnContentEditable: false,
    },
    []
  );

  useHotkeys(
    "meta+d, ctrl+d",
    (event) => {
      event.preventDefault();
      onPaste(onCopy() ?? "");
    },
    {},
    []
  );

  useHotkeys(
    "meta+e, 'ctrl+e",
    () => {
      const selectedInstanceSelector = selectedInstanceSelectorStore.get();
      if (selectedInstanceSelector === undefined) {
        return;
      }
      const targetInstanceId = selectedInstanceSelector[0];
      editingItemIdStore.set(targetInstanceId);
    },
    {},
    []
  );
};
