import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  areMapsShallowEqual,
  areSetsEqual,
} from "~/shared/collection-equality";
import {
  encodeDataVariableId,
  getResourceCycleDataSourceIds,
  SYSTEM_VARIABLE_ID,
  systemParameter,
  type DataSource,
  type DataSources,
  type Page,
  type PageTemplate,
} from "@webstudio-is/sdk";
import {
  browserInfoParameterName,
  formDataParameterName,
} from "@webstudio-is/sdk/runtime";
import {
  getFormOccurrenceKey,
  $livePreviewFormValues,
  toPublicPreviewValue,
} from "~/shared/preview-form-values";
import {
  getBrowserInfoPreview,
  getFormDataPreview,
} from "./form-context-preview";
import {
  $selectedInstancePathWithRoot,
  $selectedPage,
  $variableValuesByInstanceSelector,
  getInstanceKey,
} from "~/shared/nano-states";
import { $dataSources, $resources } from "~/shared/sync/data-stores";
import type { InstancePath } from "@webstudio-is/project-build/runtime";

export const getResourceScopeForInstance = ({
  page,
  instanceKey,
  dataSources,
  variableValuesByInstanceSelector,
  includeResourceDataSources = false,
  formScopeInstanceId,
  formScopeSelector,
  liveFormValues = new Map(),
}: {
  page: undefined | Page | PageTemplate;
  instanceKey: undefined | string;
  dataSources: DataSources;
  variableValuesByInstanceSelector: Map<string, Map<string, unknown>>;
  includeResourceDataSources?: boolean;
  formScopeInstanceId?: string;
  formScopeSelector?: readonly string[];
  liveFormValues?: ReadonlyMap<string, Record<string, unknown>>;
}) => {
  const scope: Record<string, unknown> = {};
  const aliases = new Map<string, string>();
  const variableValues = new Map<DataSource["id"], unknown>();
  const hiddenDataSourceIds = new Set<DataSource["id"]>();
  for (const dataSource of dataSources.values()) {
    // Hide collection/component parameters from resource expressions. They are
    // internal scoped runtime values, and exposing them here would invite
    // request waterfalls/loops and complicate generated resource code.
    if (
      dataSource.type === "parameter" &&
      !(
        dataSource.scopeInstanceId === formScopeInstanceId &&
        (dataSource.name === formDataParameterName ||
          dataSource.name === browserInfoParameterName)
      )
    ) {
      hiddenDataSourceIds.add(dataSource.id);
    }
    if (
      dataSource.type === "resource" &&
      includeResourceDataSources === false
    ) {
      hiddenDataSourceIds.add(dataSource.id);
    }
  }
  if (page?.systemDataSourceId) {
    hiddenDataSourceIds.delete(page.systemDataSourceId);
  }
  if (formScopeInstanceId) {
    for (const dataSource of dataSources.values()) {
      if (
        dataSource.type !== "parameter" ||
        dataSource.scopeInstanceId !== formScopeInstanceId ||
        (dataSource.name !== formDataParameterName &&
          dataSource.name !== browserInfoParameterName)
      ) {
        continue;
      }
      const name = encodeDataVariableId(dataSource.id);
      const value =
        dataSource.name === formDataParameterName
          ? (liveFormValues.get(
              getFormOccurrenceKey(formScopeSelector, formScopeInstanceId) ?? ""
            ) ?? getFormDataPreview(formScopeInstanceId))
          : getBrowserInfoPreview();
      const previewValue = toPublicPreviewValue(value);
      scope[name] = previewValue;
      aliases.set(name, dataSource.name);
      variableValues.set(dataSource.id, previewValue);
    }
  }
  const values = variableValuesByInstanceSelector.get(instanceKey ?? "");
  if (values) {
    for (const [dataSourceId, value] of values) {
      if (hiddenDataSourceIds.has(dataSourceId)) {
        continue;
      }
      let dataSource = dataSources.get(dataSourceId);
      if (dataSourceId === SYSTEM_VARIABLE_ID) {
        dataSource = systemParameter;
      }
      if (dataSource) {
        if (
          dataSource.type === "parameter" &&
          dataSource.scopeInstanceId === formScopeInstanceId &&
          (dataSource.name === formDataParameterName ||
            dataSource.name === browserInfoParameterName)
        ) {
          continue;
        }
        const name = encodeDataVariableId(dataSourceId);
        scope[name] = value;
        aliases.set(name, dataSource.name);
        variableValues.set(dataSourceId, value);
      }
    }
  }
  return { variableValues, scope, aliases };
};

const getVariableInstanceKey = ({
  variable,
  instancePath,
}: {
  variable: undefined | DataSource;
  instancePath: undefined | InstancePath;
}) => {
  if (instancePath === undefined) {
    return;
  }
  // find instance key for variable instance
  for (const { instance, instanceSelector } of instancePath) {
    if (instance.id === variable?.scopeInstanceId) {
      return getInstanceKey(instanceSelector);
    }
  }
  // and fallback to currently selected instance
  return getInstanceKey(instancePath[0].instanceSelector);
};

const createResourceScopeStore = (variable: DataSource | undefined) => {
  let cachedBaseInputs: readonly unknown[] | undefined;
  let cachedBaseValues: Map<string, unknown> | undefined;
  let cachedBaseResult:
    | ReturnType<typeof getResourceScopeForInstance>
    | undefined;
  let cachedCycleDataSourceIds: Set<DataSource["id"]> | undefined;
  let cachedResult:
    | {
        scope: Record<string, unknown>;
        aliases: Map<string, string>;
        variableValues: Map<DataSource["id"], unknown>;
      }
    | undefined;

  return computed(
    [
      $selectedPage,
      $selectedInstancePathWithRoot,
      $variableValuesByInstanceSelector,
      $dataSources,
      $resources,
      $livePreviewFormValues,
    ],
    (
      page,
      instancePath,
      variableValuesByInstanceSelector,
      dataSources,
      resources,
      liveFormValues
    ) => {
      const variablePathIndex =
        variable === undefined
          ? 0
          : (instancePath?.findIndex(
              ({ instance }) => instance.id === variable.scopeInstanceId
            ) ?? -1);
      const formScopeInstanceId =
        variablePathIndex < 0
          ? undefined
          : instancePath
              ?.slice(variablePathIndex)
              .find(({ instance }) => instance.component === "NativeForm")
              ?.instance.id;
      const formScopeSelector =
        formScopeInstanceId === undefined
          ? undefined
          : instancePath?.find(
              ({ instance }) => instance.id === formScopeInstanceId
            )?.instanceSelector;
      const instanceKey = getVariableInstanceKey({
        variable,
        instancePath,
      });
      const values = variableValuesByInstanceSelector.get(instanceKey ?? "");
      const currentBaseInputs = [
        page,
        instancePath,
        dataSources,
        liveFormValues,
      ] as const;
      const baseInputsMatch =
        cachedBaseInputs !== undefined &&
        cachedBaseInputs[0] === page &&
        cachedBaseInputs[1] === instancePath &&
        cachedBaseInputs[2] === dataSources &&
        cachedBaseInputs[3] === liveFormValues &&
        areMapsShallowEqual(cachedBaseValues, values);
      if (baseInputsMatch === false) {
        cachedBaseInputs = currentBaseInputs;
        cachedBaseValues = values;
        cachedBaseResult = getResourceScopeForInstance({
          page,
          instanceKey,
          dataSources,
          variableValuesByInstanceSelector,
          includeResourceDataSources: true,
          formScopeInstanceId,
          formScopeSelector,
          liveFormValues,
        });
      }
      const cycleDataSourceIds = new Set(
        variable === undefined
          ? []
          : variable.type === "resource"
            ? getResourceCycleDataSourceIds({
                resourceDataSource: variable,
                resources,
                dataSources,
              })
            : [variable.id]
      );
      if (
        cachedResult !== undefined &&
        baseInputsMatch &&
        cachedCycleDataSourceIds !== undefined &&
        areSetsEqual(cachedCycleDataSourceIds, cycleDataSourceIds)
      ) {
        return cachedResult;
      }

      const { scope, aliases, variableValues } = cachedBaseResult!;
      const newScope = { ...scope };
      const newAliases = new Map(aliases);
      const newVariableValues = new Map(variableValues);
      for (const dataSourceId of cycleDataSourceIds) {
        const key = encodeDataVariableId(dataSourceId);
        delete newScope[key];
        newAliases.delete(key);
        newVariableValues.delete(dataSourceId);
      }
      const result = {
        scope: newScope,
        aliases: newAliases,
        variableValues: newVariableValues,
      };
      cachedCycleDataSourceIds = cycleDataSourceIds;
      cachedResult = result;
      return result;
    }
  );
};

export const useResourceScope = ({ variable }: { variable?: DataSource }) => {
  const store = useMemo(() => createResourceScopeStore(variable), [variable]);
  return useStore(store);
};
