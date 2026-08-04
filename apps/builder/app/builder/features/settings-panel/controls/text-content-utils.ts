import type { Instance } from "@webstudio-is/sdk";

export const getEditableTextTarget = (instance: Instance) => {
  const [onlyChild] = instance.children;
  if (instance.children.length === 1 && onlyChild?.type !== "id") {
    return { childIndex: 0, child: onlyChild };
  }

  for (const [childIndex, child] of instance.children.entries()) {
    if (child.type === "expression") {
      return { childIndex, child };
    }
  }
};

export const getTextContentUpdateOperation = ({
  instance,
  type,
  value,
}: {
  instance: Instance | undefined;
  type: "text" | "expression";
  value: string;
}) => {
  if (instance === undefined) {
    return;
  }
  const childIndex = getEditableTextTarget(instance)?.childIndex;
  if (childIndex !== undefined) {
    return {
      id: "instances.updateText" as const,
      input: {
        instanceId: instance.id,
        childIndex,
        mode: type,
        text: value,
      },
    };
  }
  if (instance.children.length > 0) {
    return;
  }
  return {
    id: "instances.setTextContent" as const,
    input: {
      operation: "set" as const,
      instanceId: instance.id,
      mode: type,
      text: value,
    },
  };
};
