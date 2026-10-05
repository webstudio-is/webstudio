import type { Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import { findTreeInstanceIds } from "./instances-utils";

/** Named email controls available for visitor-directed Email Resources. */
export const getFormEmailFieldNames = (
  instances: Instances,
  props: Props,
  formId: string
): string[] => {
  const names = new Set<string>();
  for (const instanceId of findTreeInstanceIds(instances, formId)) {
    const instance = instances.get(instanceId);
    const getField = (name: string) => {
      const prop = Array.from(props.values()).find(
        (prop) => prop.instanceId === instanceId && prop.name === name
      );
      return prop?.type === "string" ? prop.value : undefined;
    };
    if (
      (instance?.component === "Input" ||
        instance?.tag?.toLowerCase() === "input" ||
        getField("tag")?.toLowerCase() === "input") &&
      getField("type")?.toLowerCase() === "email" &&
      getField("name")
    ) {
      names.add(getField("name")!);
    }
  }
  return [...names];
};
