import {
  blockComponent,
  blockTemplateComponent,
  contentBlockDocumentProp,
  getWritableContentBlockDocumentBinding,
  getContentBlockSource,
  isSafeContentBlockDocumentPath,
  type ExpressionBinding,
  type ExpressionBindingMode,
  type Instance,
  type Instances,
  type Props,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";

export const getSelectedContentBlockDocumentBindingPath = ({
  binding,
  instanceSelector,
  instances,
  props,
  sourceBlockInstanceId,
  renderedBlockInstanceId,
}: {
  binding: ExpressionBinding;
  instanceSelector: InstanceSelector;
  instances: Pick<Instances, "get">;
  props: Props;
  sourceBlockInstanceId?: Instance["id"];
  renderedBlockInstanceId?: Instance["id"];
}) => {
  if (
    instanceSelector.some(
      (instanceId) =>
        instances.get(instanceId)?.component === blockTemplateComponent
    )
  ) {
    return;
  }
  const selectedBlockInstanceId = instanceSelector.find(
    (instanceId) => instances.get(instanceId)?.component === blockComponent
  );
  const owningBlockInstanceIds = [
    sourceBlockInstanceId,
    renderedBlockInstanceId,
  ].filter((instanceId) => instanceId !== undefined);
  if (
    selectedBlockInstanceId !== undefined &&
    owningBlockInstanceIds.length > 0 &&
    owningBlockInstanceIds.includes(selectedBlockInstanceId) === false
  ) {
    return;
  }
  const blockInstanceIds =
    owningBlockInstanceIds.length > 0
      ? owningBlockInstanceIds
      : selectedBlockInstanceId === undefined
        ? []
        : [selectedBlockInstanceId];
  const allProps = Array.from(props.values());
  for (const [index, blockInstanceId] of blockInstanceIds.entries()) {
    if (blockInstanceIds.indexOf(blockInstanceId) !== index) {
      continue;
    }
    const blockProps = allProps.filter(
      (prop) => prop.instanceId === blockInstanceId
    );
    if (
      getContentBlockSource({
        blockInstanceId,
        props: blockProps,
      }) === undefined
    ) {
      continue;
    }
    const documentProp = blockProps.find(
      (prop) =>
        prop.name === contentBlockDocumentProp && prop.type === "parameter"
    );
    if (documentProp?.type !== "parameter") {
      continue;
    }
    const target = getWritableContentBlockDocumentBinding({
      binding,
      documentDataSourceId: documentProp.value,
    });
    if (target !== undefined) {
      return target.frontmatterPath;
    }
  }
};

export const getSelectedContentBlockExpressionMode = ({
  expression,
  ...context
}: Omit<
  Parameters<typeof getSelectedContentBlockDocumentBindingPath>[0],
  "binding"
> & { expression: string }): ExpressionBindingMode =>
  getSelectedContentBlockDocumentBindingPath({
    ...context,
    binding: { type: "expression", value: expression, mode: "readwrite" },
  }) === undefined
    ? "read"
    : "readwrite";

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
  if (isSafeContentBlockDocumentPath(path) === false) {
    throw new Error("Frontmatter object path is invalid");
  }
  const update = (current: unknown, index: number): unknown => {
    const segment = path[index];
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
  if (isSafeContentBlockDocumentPath(path) === false) {
    return false;
  }
  let current: unknown = value;
  for (const [index, segment] of path.entries()) {
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
