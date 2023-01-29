import type { Options } from "react-hotkeys-hook";

export const shortcuts = {
  esc: "esc",
  undo: "cmd+z, ctrl+z",
  redo: "cmd+shift+z, ctrl+shift+z",
  preview: "cmd+shift+p, ctrl+shift+p",
  delete: "backspace, delete",
  breakpointsMenu: "cmd+b, ctrl+b",
  breakpoint: Array.from(new Array(9))
    .map((_, index) => `cmd+${index + 1}, ctrl+${index + 1}`)
    .join(", "),
  zoom: "=, -",
} as const;

export const options: Options = {
  splitKey: "+",
  keydown: true,
  enableOnTags: ["INPUT", "SELECT", "TEXTAREA"],
};
