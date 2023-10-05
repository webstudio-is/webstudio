import { shallowEqual } from "shallow-equal";
import { nanoid } from "nanoid";
import { z } from "zod";
import { toast } from "@webstudio-is/design-system";
import { findTreeInstanceIds } from "@webstudio-is/sdk";
import {
  Asset,
  Breakpoint,
  DataSource,
  Instance,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
  StyleSourceSelections,
} from "@webstudio-is/sdk";
import {
  encodeDataSourceVariable,
  validateExpression,
  decodeDataSourceVariable,
  computeExpressionsDependencies,
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
  dataSourcesLogicStore,
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
  isInstanceDetachable,
} from "../instance-utils";
import { getMapValuesBy, getMapValuesByKeysSet } from "../array-utils";
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

const findTreeStyleSourceIds = (
  styleSourceSelections: StyleSourceSelections,
  treeInstanceIds: Set<Instance["id"]>
) => {
  const treeStyleSourceIds = new Set<StyleSource["id"]>();
  for (const { instanceId, values } of styleSourceSelections.values()) {
    // skip selections outside of tree
    if (treeInstanceIds.has(instanceId) === false) {
      continue;
    }
    for (const styleSourceId of values) {
      treeStyleSourceIds.add(styleSourceId);
    }
  }
  return treeStyleSourceIds;
};

const getAssetsUsedInStyle = (
  style: StyleDecl[],
  foundAssetsIds = new Set<Asset["id"]>()
) => {
  const fontFamilies = new Set<string>();

  const processValues = (values: StyleDecl["value"][]) => {
    for (const value of values) {
      if (value.type === "fontFamily") {
        for (const fontFamily of value.value) {
          fontFamilies.add(fontFamily);
        }
        continue;
      }
      if (value.type === "image") {
        if (value.value.type === "asset") {
          foundAssetsIds.add(value.value.value);
        }
        continue;
      }
      if (value.type === "var") {
        processValues(value.fallbacks);
        continue;
      }
      if (value.type === "tuple" || value.type === "layers") {
        processValues(value.value);
        continue;
      }
      if (
        value.type === "unit" ||
        value.type === "keyword" ||
        value.type === "unparsed" ||
        value.type === "invalid" ||
        value.type === "unset" ||
        value.type === "rgb"
      ) {
        continue;
      }
      value satisfies never;
    }
  };

  processValues(style.map(({ value }) => value));

  for (const asset of assetsStore.get().values()) {
    if (asset?.type === "font" && fontFamilies.has(asset.meta.family)) {
      foundAssetsIds.add(asset.id);
    }
  }

  return foundAssetsIds;
};

const getAssetsUsedInProps = (props: Prop[], foundAssetsIds = new Set()) => {
  for (const prop of props) {
    if (prop.type === "asset") {
      foundAssetsIds.add(prop.value);
      continue;
    }
    if (
      prop.type === "number" ||
      prop.type === "string" ||
      prop.type === "boolean" ||
      prop.type === "page" ||
      prop.type === "string[]" ||
      prop.type === "dataSource" ||
      prop.type === "action"
    ) {
      continue;
    }
    prop satisfies never;
  }
  return foundAssetsIds;
};

const getPropTypeAndValue = (value: unknown) => {
  if (typeof value === "boolean") {
    return { type: "boolean", value } as const;
  }
  if (typeof value === "number") {
    return { type: "number", value } as const;
  }
  if (typeof value === "string") {
    return { type: "string", value } as const;
  }
  if (Array.isArray(value)) {
    return { type: "string[]", value } as const;
  }
  throw Error(`Unexpected prop value ${value}`);
};

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
  const instances = instancesStore.get();
  const treeInstanceIds = findTreeInstanceIds(instances, targetInstanceId);
  const styleSourceSelections = styleSourceSelectionsStore.get();
  const treeStyleSourceIds = findTreeStyleSourceIds(
    styleSourceSelections,
    treeInstanceIds
  );

  // first item is guaranteed root of copied tree
  const treeInstances = getMapValuesByKeysSet(instances, treeInstanceIds);

  const dataSources = dataSourcesStore.get();
  const expressions = new Map<string, string>();
  for (const dataSource of dataSources.values()) {
    if (dataSource.type === "expression") {
      expressions.set(encodeDataSourceVariable(dataSource.id), dataSource.code);
    }
  }
  const dependencies = computeExpressionsDependencies(expressions);

  const treeDataSources = getMapValuesBy(dataSources, (dataSource) => {
    if (dataSource.type === "expression") {
      const expressionDeps = dependencies.get(
        encodeDataSourceVariable(dataSource.id)
      );
      if (expressionDeps) {
        for (const dependency of expressionDeps) {
          const dataSourceId = decodeDataSourceVariable(dependency);
          if (dataSourceId === undefined) {
            continue;
          }
          const dataSource = dataSources.get(dataSourceId);
          if (dataSource === undefined) {
            continue;
          }
          if (
            dataSource.scopeInstanceId === undefined ||
            treeInstanceIds.has(dataSource.scopeInstanceId) === false
          ) {
            return false;
          }
        }
      }
    }
    return (
      dataSource.scopeInstanceId !== undefined &&
      treeInstanceIds.has(dataSource.scopeInstanceId)
    );
  });
  const treeDataSourceIds = new Set(
    treeDataSources.map((dataSource) => dataSource.id)
  );

  const dataSourcesLogic = dataSourcesLogicStore.get();
  const treeProps = getMapValuesBy(propsStore.get(), (prop) =>
    treeInstanceIds.has(prop.instanceId)
  ).map((prop) => {
    if (prop.type === "dataSource") {
      const dataSourceId = prop.value;
      // copy data source if scoped to one of copied instances
      if (treeDataSourceIds.has(dataSourceId)) {
        return prop;
      }
      // convert data source prop to typed prop
      // when data source is not scoped to one of copied instances
      const value = dataSourcesLogic.get(dataSourceId);
      return {
        id: prop.id,
        instanceId: prop.instanceId,
        name: prop.name,
        ...getPropTypeAndValue(value),
      } satisfies Prop;
    }
    if (prop.type === "action") {
      return {
        ...prop,
        value: prop.value.flatMap((value) => {
          if (value.type !== "execute") {
            return [value];
          }
          let shouldKeepAction = true;
          validateExpression(value.code, {
            effectful: true,
            transformIdentifier: (identifier) => {
              if (value.args.includes(identifier)) {
                return identifier;
              }
              const id = decodeDataSourceVariable(identifier);
              if (id === undefined) {
                return identifier;
              }
              if (treeDataSourceIds.has(id) === false) {
                shouldKeepAction = false;
                return identifier;
              }
              const identifierDeps = dependencies.get(id);
              if (identifierDeps) {
                for (const dependency of identifierDeps) {
                  const id = decodeDataSourceVariable(dependency);
                  if (id === undefined) {
                    continue;
                  }
                  if (treeDataSourceIds.has(id) === false) {
                    shouldKeepAction = false;
                    return identifier;
                  }
                }
              }
              return identifier;
            },
          });
          if (shouldKeepAction) {
            return [value];
          }
          return [];
        }),
      };
    }
    return prop;
  });

  const treeStyleSourceSelections = getMapValuesByKeysSet(
    styleSourceSelections,
    treeInstanceIds
  );

  const treeStyleSources = getMapValuesByKeysSet(
    styleSourcesStore.get(),
    treeStyleSourceIds
  );

  const treeStyles = getMapValuesBy(stylesStore.get(), (styleDecl) =>
    treeStyleSourceIds.has(styleDecl.styleSourceId)
  );

  const treeBreapointIds = new Set<Breakpoint["id"]>();
  for (const styleDecl of treeStyles) {
    treeBreapointIds.add(styleDecl.breakpointId);
  }
  const treeBreapoints = getMapValuesByKeysSet(
    breakpointsStore.get(),
    treeBreapointIds
  );

  const treeAssets = getMapValuesByKeysSet(
    assetsStore.get(),
    getAssetsUsedInProps(treeProps, getAssetsUsedInStyle(treeStyles))
  );

  return {
    instanceSelector: targetInstanceSelector,
    breakpoints: treeBreapoints,
    instances: treeInstances,
    styleSources: treeStyleSources,
    dataSources: treeDataSources,
    props: treeProps,
    styleSourceSelections: treeStyleSourceSelections,
    styles: treeStyles,
    assets: treeAssets,
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
