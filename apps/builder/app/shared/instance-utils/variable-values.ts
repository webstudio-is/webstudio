import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";

export const getInstanceVariableValues = (
  valuesByInstanceSelector: ReadonlyMap<string, ReadonlyMap<string, unknown>>,
  instanceSelector: InstanceSelector,
  fallbackValues?: ReadonlyMap<string, unknown>
) => {
  const scopedValues =
    valuesByInstanceSelector.get(JSON.stringify(instanceSelector)) ??
    valuesByInstanceSelector.get(
      JSON.stringify(
        instanceSelector.at(-1) === ROOT_INSTANCE_ID
          ? instanceSelector
          : [...instanceSelector, ROOT_INSTANCE_ID]
      )
    );
  if (fallbackValues === undefined || scopedValues === undefined) {
    return scopedValues ?? fallbackValues;
  }
  return new Map([...fallbackValues, ...scopedValues]);
};
