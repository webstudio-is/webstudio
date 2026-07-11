import type { BuilderState } from "../state/builder-state";

export const dynamicPropTypes = new Set([
  "expression",
  "parameter",
  "resource",
]);

export const isDynamicPropType = (type: string | undefined) =>
  type !== undefined && dynamicPropTypes.has(type);

export type AccessibleContentState = {
  hasStatic: boolean;
  hasDynamic: boolean;
};

export const getAccessibleContentState = (
  instanceId: string,
  instances: NonNullable<BuilderState["instances"]>,
  visited = new Set<string>()
): AccessibleContentState => {
  if (visited.has(instanceId)) {
    return { hasStatic: false, hasDynamic: false };
  }
  visited.add(instanceId);
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return { hasStatic: false, hasDynamic: false };
  }
  let hasStatic = false;
  let hasDynamic = false;
  for (const child of instance.children) {
    if (child.type === "text") {
      hasStatic ||= child.value.trim().length > 0;
      continue;
    }
    if (child.type === "expression") {
      hasDynamic = true;
      continue;
    }
    const nested = getAccessibleContentState(child.value, instances, visited);
    hasStatic ||= nested.hasStatic;
    hasDynamic ||= nested.hasDynamic;
  }
  return { hasStatic, hasDynamic };
};

const hasNonEmptyValue = (value: unknown) =>
  value !== undefined && (typeof value !== "string" || value.trim() !== "");

export const hasAccessibleName = ({
  instanceId,
  instances,
  propsByInstance,
  propTypesByInstance,
  visited = new Set<string>(),
}: {
  instanceId: string;
  instances: NonNullable<BuilderState["instances"]>;
  propsByInstance: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
  propTypesByInstance?: ReadonlyMap<string, ReadonlyMap<string, string>>;
  visited?: Set<string>;
}): boolean => {
  if (visited.has(instanceId)) {
    return false;
  }
  visited.add(instanceId);
  const props = propsByInstance.get(instanceId);
  const propTypes = propTypesByInstance?.get(instanceId);
  const names = ["aria-label", "aria-labelledby", "title"];
  if (
    names.some(
      (name) =>
        isDynamicPropType(propTypes?.get(name)) ||
        hasNonEmptyValue(props?.get(name))
    )
  ) {
    return true;
  }
  const instance = instances.get(instanceId);
  if (
    instance !== undefined &&
    (instance.component === "Image" || instance.tag === "img") &&
    (isDynamicPropType(propTypes?.get("alt")) ||
      hasNonEmptyValue(props?.get("alt")))
  ) {
    return true;
  }
  return (
    instance?.children.some((child) => {
      if (child.type === "text") {
        return child.value.trim().length > 0;
      }
      if (child.type === "expression") {
        return true;
      }
      return hasAccessibleName({
        instanceId: child.value,
        instances,
        propsByInstance,
        propTypesByInstance,
        visited,
      });
    }) ?? false
  );
};
