import type { Instance } from "@webstudio-is/sdk";

export const getEditableTextChildIndex = (instance: Instance) => {
  if (instance.children.length === 1 && instance.children[0]?.type !== "id") {
    return 0;
  }

  const expressionIndexes = instance.children.flatMap((child, index) =>
    child.type === "expression" ? [index] : []
  );
  if (expressionIndexes.length === 1) {
    return expressionIndexes[0];
  }
};
