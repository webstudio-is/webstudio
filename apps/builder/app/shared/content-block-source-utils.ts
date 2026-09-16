import { resolveContentBlockSourceAssetId } from "@webstudio-is/project-build/runtime";
import {
  ROOT_INSTANCE_ID,
  type ContentBlockSource,
  type Instances,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import { getInstanceVariableValues } from "./instance-utils/variable-values";

export const parseContentBlockRenderScope = (renderScope: string) => {
  try {
    const value: unknown = JSON.parse(renderScope);
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((instanceId) => typeof instanceId === "string")
    ) {
      return value as InstanceSelector;
    }
  } catch {
    return;
  }
};

export const resolveContentBlockOccurrenceAssetId = ({
  source,
  instanceSelector,
  variableValuesByRenderScope,
}: {
  source: ContentBlockSource;
  instanceSelector: InstanceSelector;
  variableValuesByRenderScope: ReadonlyMap<
    string,
    ReadonlyMap<string, unknown>
  >;
}) =>
  resolveContentBlockSourceAssetId({
    source,
    values: getInstanceVariableValues(
      variableValuesByRenderScope,
      instanceSelector
    ),
  });

export const isRepeatedContentBlockOccurrence = ({
  instanceSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) =>
  instanceSelector.some(
    (instanceId) =>
      instanceId !== ROOT_INSTANCE_ID && instances.has(instanceId) === false
  );
