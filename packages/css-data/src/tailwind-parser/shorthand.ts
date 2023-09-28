export const expandShorthand = (property: string) => {};

/**
 * Expands shorthand CSS properties into their long-form equivalents.
 * For example, 'mx' is expanded to 'mr' (margin-right) and 'ml' (margin-left).
 **/
export const expandTailwindShorthand = (classname: string) => {
  let expanded = conflictingClassGroups[classname];

  if (expanded) {
    return expanded.join(" ");
  }

  const parts = classname.split("-");
  const modifier = parts.pop();
  const base = parts.join("-");

  expanded = conflictingClassGroups[base];

  if (expanded) {
    return expanded.map((cls) => `${cls}-${modifier}`).join(" ");
  }

  return classname;
};

/**
 * A little bit changed tailwind-merge
 * conflictingClassGroups https://github.com/dcastil/tailwind-merge/blob/fb1fc1f9d106f2184e24949e6e6d1a67904706fa/src/lib/default-config.ts#L1716
 *
 * Attributions
 * MIT License
 * Copyright (c) 2021 Dany Castillo
 **/
const conflictingClassGroups: Record<string, string[]> = {
  overflow: ["overflow-x", "overflow-y"],
  overscroll: ["overscroll-x", "overscroll-y"],
  inset: ["top", "right", "bottom", "left"],
  "inset-x": ["right", "left"],
  "inset-y": ["top", "bottom"],

  "flex-initial": ["grow-0", "shrink", "basis-auto"], // 0 1 auto
  "flex-auto": ["grow", "shrink", "basis-auto"], // 1 1 auto
  none: ["grow-0", "shrink-0", "basis-auto"], // 0 0 auto,
  "flex-1": ["grow", "shrink", "basis-[0%]"], // 1 1 0%,

  gap: ["gap-x", "gap-y"],

  p: ["pt", "pr", "pb", "pl"],
  px: ["pr", "pl"],
  py: ["pt", "pb"],
  m: ["mt", "mr", "mb", "ml"],
  mx: ["mr", "ml"],
  my: ["mt", "mb"],

  rounded: ["rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
  "rounded-t": ["rounded-tl", "rounded-tr"],
  "rounded-r": ["rounded-tr", "rounded-br"],
  "rounded-b": ["rounded-br", "rounded-bl"],
  "rounded-l": ["rounded-tl", "rounded-bl"],

  "border-spacing": ["border-spacing-x", "border-spacing-y"],

  "border-w": ["border-w-t", "border-w-r", "border-w-b", "border-w-l"],
  "border-w-x": ["border-w-r", "border-w-l"],
  "border-w-y": ["border-w-t", "border-w-b"],
  /*
  We are supporting shorthand for border-color
  "border-color": [
    "border-color-t",
    "border-color-r",
    "border-color-b",
    "border-color-l",
  ],
  "border-color-x": ["border-color-r", "border-color-l"],
  "border-color-y": ["border-color-t", "border-color-b"],
  */
};
