export const expandShorthand = (property: string) => {};

/**
 * Expands shorthand CSS properties into their long-form equivalents.
 * For example, 'mx' is expanded to 'mr' (margin-right) and 'ml' (margin-left).
 **/
export const expandTailwindShorthand = (classnames: string) => {
  return classnames
    .trim()
    .split(/\s+/)
    .map((classname) => {
      const groupKey = Object.keys(conflictingClassGroups).find(
        (key) => classname.startsWith(`${key}-`) || classname === key
      );

      if (groupKey === undefined) {
        return classname;
      }

      const group = conflictingClassGroups[groupKey];
      const modifier = classname.substring(groupKey.length);
      const expanded = group.map((cls) => `${cls}${modifier}`);

      return expanded.join(" ");
    })
    .join(" ");
};

const orderByKeysDesc = (obj: Record<string, string[]>) => {
  const ordered: Record<string, string[]> = {};
  Object.keys(obj)
    .sort()
    .reverse()
    .forEach((key) => {
      ordered[key] = obj[key];
    });
  return ordered;
};

/**
 * A little bit changed tailwind-merge
 * conflictingClassGroups https://github.com/dcastil/tailwind-merge/blob/fb1fc1f9d106f2184e24949e6e6d1a67904706fa/src/lib/default-config.ts#L1716
 *
 * Attributions
 * MIT License
 * Copyright (c) 2021 Dany Castillo
 **/
const conflictingClassGroups: Record<string, string[]> = orderByKeysDesc({
  overflow: ["overflow-x", "overflow-y"],
  overscroll: ["overscroll-x", "overscroll-y"],
  inset: ["top", "right", "bottom", "left"],
  "inset-x": ["right", "left"],
  "inset-y": ["top", "bottom"],

  "flex-initial": ["grow-0", "shrink", "basis-auto"], // 0 1 auto
  "flex-auto": ["grow", "shrink", "basis-auto"], // 1 1 auto
  "flex-none": ["grow-0", "shrink-0", "basis-auto"], // 0 0 auto,
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

  "rounded-tl": ["rounded-tl"],
  "rounded-tr": ["rounded-tr"],
  "rounded-br": ["rounded-br"],
  "rounded-bl": ["rounded-bl"],

  "border-spacing": ["border-spacing-x", "border-spacing-y"],

  "border-x": ["border-r", "border-l"],
  "border-y": ["border-t", "border-b"],
  "border-r": ["border-r"],
  "border-l": ["border-l"],
  "border-b": ["border-b"],
  "border-t": ["border-t"],

  border: ["border-t", "border-r", "border-b", "border-l"],
});
