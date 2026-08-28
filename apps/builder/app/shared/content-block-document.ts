import {
  blockComponent,
  contentBlockDocumentProp,
  getContentBlockDocumentBindingPath,
  type Instance,
  type Instances,
  type Props,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";

export const getSelectedContentBlockDocumentBindingPath = ({
  expression,
  instanceSelector,
  instances,
  props,
  sourceBlockInstanceId,
}: {
  expression: string;
  instanceSelector: InstanceSelector;
  instances: Pick<Instances, "get">;
  props: Props;
  sourceBlockInstanceId?: Instance["id"];
}) => {
  const blockInstanceIds = [
    ...(sourceBlockInstanceId === undefined ? [] : [sourceBlockInstanceId]),
    ...instanceSelector.filter(
      (instanceId) => instances.get(instanceId)?.component === blockComponent
    ),
  ];
  const documentProp = blockInstanceIds
    .filter(
      (instanceId, index) => blockInstanceIds.indexOf(instanceId) === index
    )
    .map((instanceId) =>
      Array.from(props.values()).find(
        (prop) =>
          prop.instanceId === instanceId &&
          prop.name === contentBlockDocumentProp &&
          prop.type === "parameter"
      )
    )
    .find((prop) => prop !== undefined);
  return documentProp?.type === "parameter"
    ? getContentBlockDocumentBindingPath({
        expression,
        documentDataSourceId: documentProp.value,
      })
    : undefined;
};

export const setObjectPathValue = ({
  value,
  path,
  nextValue,
}: {
  value: Readonly<Record<string, unknown>>;
  path: readonly string[];
  nextValue: unknown;
}) => {
  if (path.length === 0) {
    return value;
  }
  const update = (current: unknown, index: number): unknown => {
    const segment = path[index];
    if (unsafePathSegments.has(segment)) {
      throw new Error("Frontmatter object path is invalid");
    }
    const isLast = index === path.length - 1;
    if (Array.isArray(current)) {
      const arrayIndex = getArrayIndex(segment);
      if (arrayIndex === undefined || arrayIndex >= current.length) {
        throw new Error("Frontmatter array path is invalid");
      }
      const result = [...current];
      result[arrayIndex] = isLast
        ? nextValue
        : update(current[arrayIndex], index + 1);
      return result;
    }
    if (
      current !== undefined &&
      (typeof current !== "object" || current === null)
    ) {
      throw new Error("Frontmatter object path is invalid");
    }
    const record =
      current === undefined
        ? {}
        : (current as Readonly<Record<string, unknown>>);
    const result = { ...record };
    result[segment] = isLast ? nextValue : update(record[segment], index + 1);
    return result;
  };
  return update(value, 0) as Readonly<Record<string, unknown>>;
};

const unsafePathSegments = new Set(["__proto__", "constructor", "prototype"]);

const getArrayIndex = (segment: string) => {
  const index = Number(segment);
  return Number.isSafeInteger(index) && index >= 0 && String(index) === segment
    ? index
    : undefined;
};

export const isObjectPathWritable = ({
  value,
  path,
}: {
  value: Readonly<Record<string, unknown>>;
  path: readonly string[];
}) => {
  let current: unknown = value;
  for (const [index, segment] of path.entries()) {
    if (unsafePathSegments.has(segment)) {
      return false;
    }
    const isLast = index === path.length - 1;
    if (Array.isArray(current)) {
      const arrayIndex = getArrayIndex(segment);
      if (arrayIndex === undefined || arrayIndex >= current.length) {
        return false;
      }
      if (isLast) {
        return true;
      }
      current = current[arrayIndex];
      continue;
    }
    if (current === undefined) {
      return true;
    }
    if (typeof current !== "object" || current === null) {
      return false;
    }
    if ("$ref" in current) {
      return false;
    }
    if (isLast) {
      return true;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return true;
};
