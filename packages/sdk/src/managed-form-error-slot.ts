import type { DataSources } from "./schema/data-sources";
import type { Instance, Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import { encodeDataVariableId } from "./expression";
import { hasPropertyAssignment } from "@webstudio-is/expression";

/** Render the original managed Form error placeholder from runtime errors without mutating authored data. */
export const resolveManagedFormErrorSlot = (
  instance: Instance,
  instances: Instances,
  dataSources: DataSources,
  props: Props
): Instance => {
  const child = instance.children[0];
  if (
    instance.children.length !== 1 ||
    child.type !== "text" ||
    child.placeholder !== true ||
    child.value !== "Sorry, something went wrong."
  ) {
    return instance;
  }
  const visited = new Set<string>();
  let current = instance;
  while (!visited.has(current.id)) {
    visited.add(current.id);
    const parent = [...instances.values()].find((candidate) =>
      candidate.children.some(
        (child) => child.type === "id" && child.value === current.id
      )
    );
    if (!parent) {
      return instance;
    }
    const component = parent.component.split(":").at(-1);
    if (component === "WebhookForm" || component === "Form") {
      return instance;
    }
    if (component === "NativeForm") {
      const resultAction = [...props.values()].find(
        (prop) =>
          prop.instanceId === parent.id &&
          prop.name === "onResultChange" &&
          prop.type === "action"
      );
      if (resultAction?.type !== "action") {
        return instance;
      }
      const errors = [...dataSources.values()].find(
        (source) =>
          source.type === "variable" &&
          source.scopeInstanceId === parent.id &&
          resultAction.value.some(({ args, code }) => {
            return args.some((arg) =>
              hasPropertyAssignment({
                code,
                target: encodeDataVariableId(source.id),
                source: arg,
                property: "errors",
              })
            );
          })
      );
      if (!errors) {
        return instance;
      }
      return {
        ...instance,
        children: [
          {
            type: "expression",
            value: encodeDataVariableId(errors.id),
          },
        ],
      };
    }
    current = parent;
  }
  return instance;
};

export const formatManagedFormErrors = (errors: unknown): string =>
  Array.isArray(errors)
    ? errors
        .map((error) =>
          typeof error?.message === "string" ? error.message : ""
        )
        .join("\n")
    : "";
