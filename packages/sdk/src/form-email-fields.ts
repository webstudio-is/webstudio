import type { Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import { findTreeInstanceIds } from "./instances-utils";
import { internalFormFieldNames } from "./managed-form-submission";

/** Keep automatic owner-email text consistent in Preview and published sites. */
export const getFormEmailStringifyOptions = (
  instances: Instances,
  props: Props,
  formId: string
) => {
  const formTreeIds = findTreeInstanceIds(instances, formId);
  const inputProps = Array.from(props.values()).filter((prop) =>
    formTreeIds.has(prop.instanceId)
  );
  const passwordNames: string[] = [];
  let omitDefaultFormData = false;
  for (const instanceId of formTreeIds) {
    const instance = instances.get(instanceId);
    const getProp = (name: string) =>
      inputProps
        .filter((prop) => prop.instanceId === instanceId && prop.name === name)
        .at(-1);
    const name = getProp("name");
    const type = getProp("type");
    const tag = getProp("tag");
    const isInput =
      instance?.component === "Input" ||
      instance?.tag?.toLowerCase() === "input" ||
      (instance?.component === "Element" &&
        ((tag?.type === "string" && tag.value.toLowerCase() === "input") ||
          (tag !== undefined &&
            tag.type !== "string" &&
            (name !== undefined || type !== undefined))));
    if (!isInput) {
      continue;
    }
    if (type !== undefined && type.type !== "string") {
      omitDefaultFormData = true;
    }
    if (type?.type === "string" && type.value.toLowerCase() === "password") {
      if (name?.type === "string") {
        passwordNames.push(name.value);
      } else {
        omitDefaultFormData = true;
      }
    }
    if (name !== undefined && name.type !== "string") {
      omitDefaultFormData = true;
    }
  }
  return omitDefaultFormData
    ? {
        stringifyAs:
          "Form fields omitted because an input has a dynamic name or type.",
      }
    : {
        space: 2,
        excludeKeys: [...internalFormFieldNames, ...passwordNames],
        fileMetadata: true,
      };
};

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
      const prop = Array.from(props.values())
        .filter((prop) => prop.instanceId === instanceId && prop.name === name)
        .at(-1);
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
