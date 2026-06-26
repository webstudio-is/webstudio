import type { Instance } from "@webstudio-is/sdk";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type { z } from "zod";
import { getExpressionErrorMessages } from "../expression-validation";

type TextContentChild = Extract<
  Instance["children"][number],
  { type: "text" | "expression" }
>;

export const isTextContentChild = (
  child: Instance["children"][number] | undefined
): child is TextContentChild =>
  child?.type === "text" || child?.type === "expression";

export const getTextContentChild = (instance: Instance, childIndex: number) => {
  const child = instance.children[childIndex];
  return isTextContentChild(child) ? child : undefined;
};

export const findTextContentChild = (
  instances: Iterable<Instance>,
  input: {
    instanceId: Instance["id"];
    childIndex: number;
    mode?: TextContentChild["type"];
  }
):
  | { status: "found"; child: TextContentChild }
  | { status: "instance-not-found" }
  | { status: "child-not-found" }
  | { status: "not-text-content" }
  | { status: "mode-mismatch"; actual: TextContentChild["type"] } => {
  let instance: Instance | undefined;
  for (const item of instances) {
    if (item.id === input.instanceId) {
      instance = item;
      break;
    }
  }
  if (instance === undefined) {
    return { status: "instance-not-found" };
  }
  if (instance.children[input.childIndex] === undefined) {
    return { status: "child-not-found" };
  }
  const child = getTextContentChild(instance, input.childIndex);
  if (child === undefined) {
    return { status: "not-text-content" };
  }
  if (input.mode !== undefined && child.type !== input.mode) {
    return { status: "mode-mismatch", actual: child.type };
  }
  return { status: "found", child };
};

export const createTextContentChild = ({
  type,
  value,
}: {
  type: TextContentChild["type"];
  value: string;
}): TextContentChild => ({ type, value });

export const getTextContentErrors = ({
  type,
  value,
}: {
  type: TextContentChild["type"];
  value: string;
}) => {
  if (type === "text") {
    return [];
  }
  return getExpressionErrorMessages({ expression: value });
};

export const setTextContentMutable = (
  instance: Instance,
  type: TextContentChild["type"],
  value: string
) => {
  instance.children = [createTextContentChild({ type, value })];
};

export const createTextContentUpdatePayload = ({
  instanceId,
  childIndex,
  child,
}: {
  instanceId: Instance["id"];
  childIndex: number;
  child: TextContentChild;
}): z.infer<typeof buildPatchTransaction>["payload"] => [
  {
    namespace: "instances",
    patches: [
      {
        op: "replace",
        path: [instanceId, "children", childIndex],
        value: child,
      },
    ],
  },
];

export const serializeTextNodes = ({
  instances,
  rootInstanceIds,
  instanceId,
  mode = "all",
  contains,
  maxValueLength,
}: {
  instances: Iterable<Instance>;
  rootInstanceIds?: Set<Instance["id"]>;
  instanceId?: Instance["id"];
  mode?: TextContentChild["type"] | "all";
  contains?: string;
  maxValueLength?: number;
}) => {
  const texts = [];
  for (const instance of instances) {
    if (instanceId !== undefined && instance.id !== instanceId) {
      continue;
    }
    if (
      rootInstanceIds !== undefined &&
      rootInstanceIds.has(instance.id) === false
    ) {
      continue;
    }
    for (const [childIndex, child] of instance.children.entries()) {
      if (isTextContentChild(child) === false) {
        continue;
      }
      if (mode !== "all" && child.type !== mode) {
        continue;
      }
      if (contains !== undefined && child.value.includes(contains) === false) {
        continue;
      }
      const value =
        maxValueLength === undefined
          ? child.value
          : child.value.slice(0, maxValueLength);
      texts.push({
        instanceId: instance.id,
        childIndex,
        component: instance.component,
        label: instance.label,
        mode: child.type,
        value,
      });
    }
  }
  return texts;
};
