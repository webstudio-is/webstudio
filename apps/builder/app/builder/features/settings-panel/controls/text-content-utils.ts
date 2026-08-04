import type { Instance } from "@webstudio-is/sdk";
import { getEditableTextTarget } from "@webstudio-is/project-build/runtime";

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
