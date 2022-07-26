export const shortcuts = {
  undo: "cmd+z, ctrl+z",
  redo: "cmd+shift+z, ctrl+shift+z",
  preview: "cmd+shift+p, ctrl+shift+p",
  copy: "cmd+c, ctrl+c",
  paste: "cmd+v, ctrl+v",
  breakpointsMenu: "cmd+b, ctrl+b",
  breakpoint: Array.from(new Array(9))
    .map((_, index) => `cmd+${index + 1}, ctrl+${index + 1}`)
    .join(", "),
  zoom: "cmd+=, ctrl+=, cmd+-, ctrl+-",
  escape: "escape",
} as const;

export const options = { splitKey: "+", keydown: true };
