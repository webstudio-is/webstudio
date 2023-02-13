import { Options, useHotkeys } from "react-hotkeys-hook";
import { selectedInstanceIdStore } from "../nano-states";
import { zoomIn, zoomOut } from "../nano-states/breakpoints";
import { deleteInstance } from "../instance-utils";

export const shortcuts = {
  esc: "esc",
  undo: "cmd+z, ctrl+z",
  redo: "cmd+shift+z, ctrl+shift+z",
  preview: "cmd+shift+p, ctrl+shift+p",
  breakpointsMenu: "cmd+b, ctrl+b",
  breakpoint: Array.from(new Array(9))
    .map((_, index) => `cmd+${index + 1}, ctrl+${index + 1}`)
    .join(", "),
} as const;

export const options: Options = {
  enableOnFormTags: true,
};

export const useSharedShortcuts = () => {
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
