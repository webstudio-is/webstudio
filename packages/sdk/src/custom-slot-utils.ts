import type { DataSource, DataSources } from "./schema/data-sources";
import type { Instance, Instances } from "./schema/instances";
import {
  customSlotComponent,
  customSlotComponentVariable,
  customSlotSchemaVariable,
  customSlotValuesVariable,
} from "./core-metas";

const findScopedDataSourceByName = (
  dataSources: DataSources,
  scopeInstanceId: Instance["id"],
  name: DataSource["name"]
) => {
  for (const dataSource of dataSources.values()) {
    if (
      dataSource.scopeInstanceId === scopeInstanceId &&
      dataSource.name === name
    ) {
      return dataSource;
    }
  }
};

export const getSlotContentRootId = (
  instances: Instances,
  slotId: Instance["id"]
) => {
  const slot = instances.get(slotId);
  if (slot?.component !== customSlotComponent) {
    return;
  }
  if (slot.children.length !== 1) {
    return;
  }
  const [child] = slot.children;
  if (child?.type !== "id") {
    return;
  }
  const root = instances.get(child.value);
  if (root?.component !== "Fragment") {
    return;
  }
  return root.id;
};

export const getSlotContentRoot = (
  instances: Instances,
  slotId: Instance["id"]
) => {
  const rootId = getSlotContentRootId(instances, slotId);
  if (rootId === undefined) {
    return;
  }
  return instances.get(rootId);
};

export const findCustomSlotSchemaDataSource = (
  dataSources: DataSources,
  fragmentRootId: Instance["id"]
) =>
  findScopedDataSourceByName(
    dataSources,
    fragmentRootId,
    customSlotSchemaVariable
  );

export const findCustomSlotValuesDataSource = (
  dataSources: DataSources,
  slotId: Instance["id"]
) => findScopedDataSourceByName(dataSources, slotId, customSlotValuesVariable);

export const findCustomSlotComponentDataSource = (
  dataSources: DataSources,
  fragmentRootId: Instance["id"]
) =>
  findScopedDataSourceByName(
    dataSources,
    fragmentRootId,
    customSlotComponentVariable
  );

export const isCustomSlotComponentDataSource = (
  instances: Instances,
  dataSource: undefined | DataSource
) => {
  if (
    dataSource?.type !== "parameter" ||
    dataSource.name !== customSlotComponentVariable ||
    dataSource.scopeInstanceId === undefined
  ) {
    return false;
  }

  for (const instance of instances.values()) {
    if (instance.component !== customSlotComponent) {
      continue;
    }
    if (
      getSlotContentRootId(instances, instance.id) ===
      dataSource.scopeInstanceId
    ) {
      return true;
    }
  }

  return false;
};
