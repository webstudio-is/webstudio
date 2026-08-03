import type { Instance } from "@webstudio-is/sdk";

type TextChild = Extract<
  Instance["children"][number],
  { type: "text" | "expression" }
>;

export const getEditableTextTarget = (instance: Instance) => {
  const [onlyChild] = instance.children;
  if (instance.children.length === 1 && onlyChild?.type !== "id") {
    return { childIndex: 0, child: onlyChild };
  }

  let target: { childIndex: number; child: TextChild } | undefined;
  for (const [childIndex, child] of instance.children.entries()) {
    if (child.type !== "expression") {
      continue;
    }
    if (target !== undefined) {
      return;
    }
    target = { childIndex, child };
  }
  return target;
};
