import { Options, useHotkeys } from "react-hotkeys-hook";
import store from "immerhin";
import { selectedInstanceIdStore } from "../nano-states";
import { zoomIn, zoomOut } from "../nano-states/breakpoints";
import { deleteInstance } from "../instance-utils";

export const shortcuts = {
  esc: "esc",
  preview: "meta+shift+p, ctrl+shift+p",
  breakpointsMenu: "meta+b, ctrl+b",
  breakpoint: Array.from(new Array(9))
    .map((_, index) => `meta+${index + 1}, ctrl+${index + 1}`)
    .join(", "),
} as const;

export const options: Options = {
  enableOnFormTags: true,
};

export const useSharedShortcuts = () => {
  useHotkeys(
    // safari use cmd+z to reopen closed tabs so fallback to ctrl
    "meta+z, ctrl+z",
    () => store.undo(),
    { enableOnFormTags: true, enableOnContentEditable: false },
    []
  );

  useHotkeys(
    // safari use cmd+shift+z to close reopened tabs so fallback to ctrl
    "meta+shift+z, ctrl+shift+z",
    () => store.redo(),
    { enableOnFormTags: true, enableOnContentEditable: false },
    []
  );

  useHotkeys(
    "backspace, delete",
    () => {
      const selectedInstanceId = selectedInstanceIdStore.get();
      if (selectedInstanceId === undefined) {
        return;
      }
      deleteInstance(selectedInstanceId);
    },
    // prevent instance deletion while deleting text
    { enableOnFormTags: false, enableOnContentEditable: false },
    []
  );

  useHotkeys(
    "equal",
    zoomIn,
    // prevent zoom while typing
    { enableOnFormTags: false, enableOnContentEditable: false },
    []
  );

  useHotkeys(
    "meta+shift+equal",
    (event) => {
      event.preventDefault();
      zoomIn();
    },
    { enableOnFormTags: true, enableOnContentEditable: true },
    []
  );

  useHotkeys(
    "minus",
    zoomOut,
    // prevent zoom while typing
    { enableOnFormTags: false, enableOnContentEditable: false },
    []
  );

  useHotkeys(
    "meta+shift+minus",
    (event) => {
      event.preventDefault();
      zoomOut();
    },
    { enableOnFormTags: true, enableOnContentEditable: true },
    []
  );
};
