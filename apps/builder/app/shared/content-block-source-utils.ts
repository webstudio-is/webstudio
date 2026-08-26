import { resolveContentBlockSourceAssetId } from "@webstudio-is/project-build/runtime";
import {
  ROOT_INSTANCE_ID,
  type ContentBlockSource,
  type Instances,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";

type VariableValuesByRenderScope = ReadonlyMap<
  string,
  ReadonlyMap<string, unknown>
>;

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

export const getContentBlockOccurrenceVariableValues = ({
  instanceSelector,
  variableValuesByRenderScope,
}: {
  instanceSelector: InstanceSelector;
  variableValuesByRenderScope: VariableValuesByRenderScope;
}) =>
  variableValuesByRenderScope.get(JSON.stringify(instanceSelector)) ??
  variableValuesByRenderScope.get(
    JSON.stringify([...instanceSelector, ROOT_INSTANCE_ID])
  );

export const resolveContentBlockOccurrenceAssetId = ({
  source,
  instanceSelector,
  variableValuesByRenderScope,
}: {
  source: ContentBlockSource;
  instanceSelector: InstanceSelector;
  variableValuesByRenderScope: VariableValuesByRenderScope;
}) =>
  resolveContentBlockSourceAssetId({
    source,
    values: getContentBlockOccurrenceVariableValues({
      instanceSelector,
      variableValuesByRenderScope,
    }),
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
