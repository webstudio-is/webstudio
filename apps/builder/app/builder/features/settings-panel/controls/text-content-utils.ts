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
