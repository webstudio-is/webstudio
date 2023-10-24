import { shallowEqual } from "shallow-equal";
import { nanoid } from "nanoid";
import { z } from "zod";
import { toast } from "@webstudio-is/design-system";
import {
  Asset,
  Breakpoint,
  DataSource,
  Instance,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  encodeDataSourceVariable,
  validateExpression,
  decodeDataSourceVariable,
} from "@webstudio-is/react-sdk";
import {
  propsStore,
  stylesStore,
  selectedInstanceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesStore,
  selectedPageStore,
  breakpointsStore,
  assetsStore,
  projectStore,
  registeredComponentMetasStore,
  dataSourcesStore,
} from "../nano-states";
import {
  type InstanceSelector,
  insertInstancesCopyMutable,
  insertPropsCopyMutable,
  insertStylesCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
  findLocalStyleSourcesWithinInstances,
  mergeNewBreakpointsMutable,
  type DroppableTarget,
} from "../tree-utils";
import {
  computeInstancesConstraints,
  deleteInstance,
  findClosestDroppableTarget,
  getInstancesSlice,
  isInstanceDetachable,
} from "../instance-utils";
import { serverSyncStore } from "../sync";

const version = "@webstudio/instance/v0.1";

const InstanceData = z.object({
  instanceSelector: z.array(z.string()),
  breakpoints: z.array(Breakpoint),
  instances: z.array(Instance),
  props: z.array(Prop),
  dataSources: z.array(DataSource),
  styleSourceSelections: z.array(StyleSourceSelection),
  styleSources: z.array(StyleSource),
  styles: z.array(StyleDecl),
  assets: z.array(Asset),
});

type InstanceData = z.infer<typeof InstanceData>;

const getTreeData = (targetInstanceSelector: InstanceSelector) => {
  if (isInstanceDetachable(targetInstanceSelector) === false) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
    return;
  }

  // @todo tell user they can't copy or cut root
  if (targetInstanceSelector.length === 1) {
    return;
  }

  const [targetInstanceId] = targetInstanceSelector;

  return {
    instanceSelector: targetInstanceSelector,
    ...getInstancesSlice(targetInstanceId),
  };
};

const stringify = (data: InstanceData) => {
  return JSON.stringify({ [version]: data });
};

const ClipboardData = z.object({ [version]: InstanceData });

const parse = (clipboardData: string): InstanceData | undefined => {
  try {
    const data = ClipboardData.parse(JSON.parse(clipboardData));
    return data[version];
  } catch {
    return;
  }
};

export const mimeType = "application/json";

export const onPaste = (clipboardData: string): boolean => {
  const data = parse(clipboardData);

  const selectedPage = selectedPageStore.get();
  const project = projectStore.get();

  if (
    data === undefined ||
    selectedPage === undefined ||
    project === undefined
  ) {
    return false;
  }

  const metas = registeredComponentMetasStore.get();
  const newInstances = new Map(
    data.instances.map((instance) => [instance.id, instance])
  );
  const rootInstanceId = data.instances[0].id;
  // paste to the root if nothing is selected
  const instanceSelector = selectedInstanceSelectorStore.get() ?? [
    selectedPage.rootInstanceId,
  ];
  let potentialDropTarget: undefined | DroppableTarget;
  if (shallowEqual(instanceSelector, data.instanceSelector)) {
    // paste after selected instance
    const instances = instancesStore.get();
    // body is not allowed to copy
    // so clipboard always have at least two level instance selector
    const [currentInstanceId, parentInstanceId] = instanceSelector;
    const parentInstance = instances.get(parentInstanceId);
    if (parentInstance === undefined) {
      return false;
    }
    const indexWithinChildren = parentInstance.children.findIndex(
      (child) => child.type === "id" && child.value === currentInstanceId
    );
    potentialDropTarget = {
      parentSelector: instanceSelector.slice(1),
      position: indexWithinChildren + 1,
    };
  } else {
    potentialDropTarget = findClosestDroppableTarget(
      metas,
      instancesStore.get(),
      instanceSelector,
      computeInstancesConstraints(metas, newInstances, [rootInstanceId])
    );
  }
  if (potentialDropTarget === undefined) {
    return false;
  }
  const dropTarget = potentialDropTarget;

  serverSyncStore.createTransaction(
    [
      breakpointsStore,
      instancesStore,
      dataSourcesStore,
      styleSourcesStore,
      propsStore,
      styleSourceSelectionsStore,
      stylesStore,
      assetsStore,
    ],
    (
      breakpoints,
      instances,
      dataSources,
      styleSources,
      props,
      styleSourceSelections,
      styles,
      assets
    ) => {
      for (const asset of data.assets) {
        // asset can be already present if pasting to the same project
        if (assets.has(asset.id) === false) {
          // we use the same asset.id so the references are preserved
          assets.set(asset.id, { ...asset, projectId: project.id });
        }
      }

      const mergedBreakpointIds = mergeNewBreakpointsMutable(
        breakpoints,
        data.breakpoints
      );

      const copiedInstanceIds = insertInstancesCopyMutable(
        instances,
        props,
        registeredComponentMetasStore.get(),
        data.instances,
        dropTarget
      );

      const copiedDataSourceIds = new Map<DataSource["id"], DataSource["id"]>();
      for (const dataSource of data.dataSources) {
        copiedDataSourceIds.set(dataSource.id, nanoid());
      }

      for (const dataSource of data.dataSources) {
        let { scopeInstanceId } = dataSource;
        if (scopeInstanceId !== undefined) {
          scopeInstanceId = copiedInstanceIds.get(scopeInstanceId);
        }
        const newId = copiedDataSourceIds.get(dataSource.id);
        if (newId === undefined) {
          continue;
        }
        if (dataSource.type === "variable") {
          dataSources.set(newId, {
            ...dataSource,
            id: newId,
            scopeInstanceId,
          });
        }
        if (dataSource.type === "expression") {
          dataSources.set(newId, {
            ...dataSource,
            id: newId,
            scopeInstanceId,
            code: validateExpression(dataSource.code, {
              transformIdentifier: (id) => {
                const dataSourceId = decodeDataSourceVariable(id);
                if (dataSourceId === undefined) {
                  return id;
                }
                const newId = copiedDataSourceIds.get(dataSourceId);
                if (newId === undefined) {
                  return id;
                }
                return encodeDataSourceVariable(newId);
              },
            }),
          });
        }
      }

      const localStyleSourceIds = findLocalStyleSourcesWithinInstances(
        data.styleSources,
        data.styleSourceSelections,
        new Set(copiedInstanceIds.keys())
      );

      const copiedStyleSourceIds = insertStyleSourcesCopyMutable(
        styleSources,
        data.styleSources,
        localStyleSourceIds
      );

      insertPropsCopyMutable(
        props,
        data.props.map((prop) => {
          if (prop.type === "action") {
            return {
              ...prop,
              value: prop.value.map((value) => {
                if (value.type !== "execute") {
                  return value;
                }
                return {
                  ...value,
                  code: validateExpression(value.code, {
                    effectful: true,
                    transformIdentifier: (id) => {
                      const dataSourceId = decodeDataSourceVariable(id);
                      if (dataSourceId === undefined) {
                        return id;
                      }
                      const newId = copiedDataSourceIds.get(dataSourceId);
                      if (newId === undefined) {
                        return id;
                      }
                      return encodeDataSourceVariable(newId);
                    },
                  }),
                };
              }),
            };
          }
          return prop;
        }),
        copiedInstanceIds,
        copiedDataSourceIds
      );
      insertStyleSourceSelectionsCopyMutable(
        styleSourceSelections,
        data.styleSourceSelections,
        copiedInstanceIds,
        copiedStyleSourceIds
      );
      insertStylesCopyMutable(
        styles,
        data.styles,
        copiedStyleSourceIds,
        mergedBreakpointIds
      );
    }
  );
  return true;
};

export const onCopy = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const data = getTreeData(selectedInstanceSelector);
  if (data === undefined) {
    return;
  }
  return stringify(data);
};

export const onCut = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  // @todo tell user they can't delete root
  if (selectedInstanceSelector.length === 1) {
    return;
  }
  const data = getTreeData(selectedInstanceSelector);
  if (data === undefined) {
    return;
  }
  deleteInstance(selectedInstanceSelector);
  if (data === undefined) {
    return;
  }
  return stringify(data);
};
