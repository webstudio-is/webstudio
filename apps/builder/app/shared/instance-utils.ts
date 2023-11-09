import { toast } from "@webstudio-is/design-system";
import {
  type Instance,
  type Instances,
  type StyleSource,
  getStyleDeclKey,
  findTreeInstanceIds,
  StyleSourceSelection,
  StyleDecl,
  Asset,
  StyleSources,
  Breakpoints,
  DataSources,
  Props,
  DataSource,
} from "@webstudio-is/sdk";
import { findTreeInstanceIdsExcludingSlotDescendants } from "@webstudio-is/sdk";
import {
  type WsComponentMeta,
  generateDataFromEmbedTemplate,
  type EmbedTemplateData,
  decodeDataSourceVariable,
  validateExpression,
} from "@webstudio-is/react-sdk";
import {
  propsStore,
  stylesStore,
  selectedInstanceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesStore,
  selectedStyleSourceSelectorStore,
  breakpointsStore,
  registeredComponentMetasStore,
  dataSourcesStore,
  assetsStore,
} from "./nano-states";
import {
  type DroppableTarget,
  type InstanceSelector,
  findLocalStyleSourcesWithinInstances,
  insertInstancesMutable,
  reparentInstanceMutable,
  getAncestorInstanceSelector,
  insertPropsCopyMutable,
} from "./tree-utils";
import { removeByMutable } from "./array-utils";
import { isBaseBreakpoint } from "./breakpoints";
import { humanizeString } from "./string-utils";
import { serverSyncStore } from "./sync";
import type { StyleValue } from "@webstudio-is/css-engine";

const getLabelFromComponentName = (component: Instance["component"]) => {
  if (component.includes(":")) {
    // strip namespace
    const [_namespace, baseName] = component.split(":");
    component = baseName;
  }
  return humanizeString(component);
};

export const getInstanceLabel = (
  instance: { component: string; label?: string },
  meta: WsComponentMeta
) => {
  return (
    instance.label ||
    meta.label ||
    getLabelFromComponentName(instance.component)
  );
};

export const findClosestEditableInstanceSelector = (
  instanceSelector: InstanceSelector,
  instances: Instances,
  metas: Map<string, WsComponentMeta>
) => {
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    const meta = metas.get(instance.component);
    if (meta === undefined) {
      return;
    }
    if (meta.type !== "container") {
      continue;
    }
    // only container with rich-text-child children and text can be edited
    for (const child of instance.children) {
      if (child.type === "id") {
        const childInstance = instances.get(child.value);
        if (childInstance === undefined) {
          return;
        }
        const childMeta = metas.get(childInstance.component);
        if (childMeta?.type !== "rich-text-child") {
          return;
        }
      }
    }
    return getAncestorInstanceSelector(instanceSelector, instanceId);
  }
};

export const findClosestDetachableInstanceSelector = (
  instanceSelector: InstanceSelector,
  instances: Instances,
  metas: Map<string, WsComponentMeta>
) => {
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    const meta = metas.get(instance.component);
    if (meta === undefined) {
      return;
    }
    const detachable = meta.detachable ?? true;
    if (meta.type === "rich-text-child" || detachable === false) {
      continue;
    }
    return getAncestorInstanceSelector(instanceSelector, instanceId);
  }
};

export const isInstanceDetachable = (instanceSelector: InstanceSelector) => {
  const instances = instancesStore.get();
  const metas = registeredComponentMetasStore.get();
  const [instanceId] = instanceSelector;
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return false;
  }
  const meta = metas.get(instance.component);
  if (meta === undefined) {
    return false;
  }
  return meta.detachable ?? true;
};

const traverseInstancesConstraints = (
  metas: Map<string, WsComponentMeta>,
  instances: Instances,
  instanceId: Instance["id"],
  requiredAncestors: Set<Instance["component"]>,
  invalidAncestors: Set<Instance["component"]>,
  componentSelector: string[] = []
) => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }
  const meta = metas.get(instance.component);
  if (meta === undefined) {
    return;
  }
  if (meta.requiredAncestors) {
    for (const requiredAncestor of meta.requiredAncestors) {
      if (componentSelector.includes(requiredAncestor) === false) {
        requiredAncestors.add(requiredAncestor);
      }
    }
  }
  if (meta.invalidAncestors) {
    for (const invalidAncestor of meta.invalidAncestors) {
      invalidAncestors.add(invalidAncestor);
    }
  }
  for (const child of instance.children) {
    if (child.type === "id") {
      traverseInstancesConstraints(
        metas,
        instances,
        child.value,
        requiredAncestors,
        invalidAncestors,
        [instance.component, ...componentSelector]
      );
    }
  }
};

export type InsertConstraints = {
  requiredAncestors: Set<Instance["component"]>;
  invalidAncestors: Set<Instance["component"]>;
};

export const computeInstancesConstraints = (
  metas: Map<string, WsComponentMeta>,
  instances: Instances,
  rootInstanceIds: Instance["id"][]
): InsertConstraints => {
  const requiredAncestors = new Set<string>();
  const invalidAncestors = new Set<string>();
  for (const instanceId of rootInstanceIds) {
    traverseInstancesConstraints(
      metas,
      instances,
      instanceId,
      requiredAncestors,
      invalidAncestors
    );
  }
  return {
    requiredAncestors,
    invalidAncestors,
  };
};

export const findClosestDroppableComponentIndex = (
  metas: Map<string, WsComponentMeta>,
  componentSelector: string[],
  constraints: InsertConstraints
) => {
  const { requiredAncestors, invalidAncestors } = constraints;

  let containerIndex = -1;
  let requiredFound = false;
  for (let index = 0; index < componentSelector.length; index += 1) {
    const ancestorComponent = componentSelector[index];
    if (invalidAncestors.has(ancestorComponent) === true) {
      containerIndex = -1;
      requiredFound = false;
      continue;
    }
    if (requiredAncestors.has(ancestorComponent) === true) {
      requiredFound = true;
    }
    const ancestorMeta = metas.get(ancestorComponent);
    if (containerIndex === -1 && ancestorMeta?.type === "container") {
      containerIndex = index;
    }
  }

  if (requiredFound || requiredAncestors.size === 0) {
    return containerIndex;
  }
  return -1;
};

export const findClosestDroppableTarget = (
  metas: Map<string, WsComponentMeta>,
  instances: Instances,
  instanceSelector: InstanceSelector,
  insertConstraints: InsertConstraints
): undefined | DroppableTarget => {
  const componentSelector: string[] = [];
  for (const instanceId of instanceSelector) {
    const component = instances.get(instanceId)?.component;
    if (component === undefined) {
      return;
    }
    componentSelector.push(component);
  }

  const droppableIndex = findClosestDroppableComponentIndex(
    metas,
    componentSelector,
    insertConstraints
  );
  if (droppableIndex === -1) {
    return;
  }
  if (droppableIndex === 0) {
    return {
      parentSelector: instanceSelector,
      position: "end",
    };
  }

  const dropTargetSelector = instanceSelector.slice(droppableIndex);
  const dropTargetInstanceId = instanceSelector[droppableIndex];
  const dropTargetInstance = instances.get(dropTargetInstanceId);
  if (dropTargetInstance === undefined) {
    return;
  }
  const lastChildInstanceId = instanceSelector[droppableIndex - 1];
  const lastChildPosition = dropTargetInstance.children.findIndex(
    (child) => child.type === "id" && child.value === lastChildInstanceId
  );
  return {
    parentSelector: dropTargetSelector,
    position: lastChildPosition + 1,
  };
};

export const insertTemplateData = (
  templateData: EmbedTemplateData,
  dropTarget: DroppableTarget
) => {
  const {
    children,
    instances: insertedInstances,
    props: insertedProps,
    dataSources: insertedDataSources,
  } = templateData;
  const rootInstanceId = insertedInstances[0].id;
  serverSyncStore.createTransaction(
    [
      instancesStore,
      // insert data sources before props to avoid error
      // about missing data source when compute data source logic
      dataSourcesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (
      instances,
      dataSources,
      props,
      styleSourceSelections,
      styleSources,
      styles
    ) => {
      insertInstancesMutable(
        instances,
        props,
        registeredComponentMetasStore.get(),
        insertedInstances,
        children,
        dropTarget
      );
      insertPropsCopyMutable(props, insertedProps, new Map(), new Map());
      for (const dataSource of insertedDataSources) {
        dataSources.set(dataSource.id, dataSource);
      }

      // insert only new style sources and their styles to support
      // embed template tokens which have persistent id
      // so when user changes these styles and then again add component with token
      // nothing breaks visually
      const insertedStyleSources = new Set<StyleSource["id"]>();
      for (const styleSource of templateData.styleSources) {
        if (styleSources.has(styleSource.id) === false) {
          insertedStyleSources.add(styleSource.id);
          styleSources.set(styleSource.id, styleSource);
        }
      }
      for (const styleDecl of templateData.styles) {
        if (insertedStyleSources.has(styleDecl.styleSourceId)) {
          styles.set(getStyleDeclKey(styleDecl), styleDecl);
        }
      }
      for (const styleSourceSelection of templateData.styleSourceSelections) {
        styleSourceSelections.set(
          styleSourceSelection.instanceId,
          styleSourceSelection
        );
      }
    }
  );

  selectedInstanceSelectorStore.set([
    rootInstanceId,
    ...dropTarget.parentSelector,
  ]);
  selectedStyleSourceSelectorStore.set(undefined);
};

export const getComponentTemplateData = (component: string) => {
  const metas = registeredComponentMetasStore.get();
  const componentMeta = metas.get(component);
  // when template not specified fallback to template with the component
  const template = componentMeta?.template ?? [
    {
      type: "instance",
      component,
      children: [],
    },
  ];
  const breakpoints = breakpointsStore.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return;
  }
  return generateDataFromEmbedTemplate(template, metas, baseBreakpoint.id);
};

export const reparentInstance = (
  targetInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  serverSyncStore.createTransaction(
    [instancesStore, propsStore],
    (instances, props) => {
      reparentInstanceMutable(
        instances,
        props,
        registeredComponentMetasStore.get(),
        targetInstanceSelector,
        dropTarget
      );
    }
  );
  selectedInstanceSelectorStore.set(targetInstanceSelector);
  selectedStyleSourceSelectorStore.set(undefined);
};

export const deleteInstance = (instanceSelector: InstanceSelector) => {
  // @todo tell user they can't delete root
  if (instanceSelector.length === 1) {
    return false;
  }
  if (isInstanceDetachable(instanceSelector) === false) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
    return false;
  }
  serverSyncStore.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
      dataSourcesStore,
    ],
    (
      instances,
      props,
      styleSourceSelections,
      styleSources,
      styles,
      dataSources
    ) => {
      let targetInstanceId = instanceSelector[0];
      const parentInstanceId = instanceSelector[1];
      const grandparentInstanceId = instanceSelector[2];
      let parentInstance =
        parentInstanceId === undefined
          ? undefined
          : instances.get(parentInstanceId);

      // delete parent fragment too if its last child is going to be deleted
      // use case for slots: slot became empty and remove display: contents
      // to be displayed properly on canvas
      if (
        parentInstance?.component === "Fragment" &&
        parentInstance.children.length === 1 &&
        grandparentInstanceId !== undefined
      ) {
        targetInstanceId = parentInstance.id;
        parentInstance = instances.get(grandparentInstanceId);
      }

      const instanceIds = findTreeInstanceIdsExcludingSlotDescendants(
        instances,
        targetInstanceId
      );
      const localStyleSourceIds = findLocalStyleSourcesWithinInstances(
        styleSources.values(),
        styleSourceSelections.values(),
        instanceIds
      );

      // may not exist when delete root
      if (parentInstance) {
        removeByMutable(
          parentInstance.children,
          (child) => child.type === "id" && child.value === targetInstanceId
        );
      }

      for (const instanceId of instanceIds) {
        instances.delete(instanceId);
      }
      // delete props, data sources and styles of deleted instance and its descendants
      for (const prop of props.values()) {
        if (instanceIds.has(prop.instanceId)) {
          props.delete(prop.id);
        }
      }
      for (const dataSource of dataSources.values()) {
        if (
          dataSource.scopeInstanceId !== undefined &&
          instanceIds.has(dataSource.scopeInstanceId)
        ) {
          dataSources.delete(dataSource.id);
        }
      }
      for (const instanceId of instanceIds) {
        styleSourceSelections.delete(instanceId);
      }
      for (const styleSourceId of localStyleSourceIds) {
        styleSources.delete(styleSourceId);
      }
      for (const [styleDeclKey, styleDecl] of styles) {
        if (localStyleSourceIds.has(styleDecl.styleSourceId)) {
          styles.delete(styleDeclKey);
        }
      }
    }
  );
  return true;
};

const traverseStyleValue = (
  value: StyleValue,
  callback: (value: StyleValue) => void
) => {
  if (
    value.type === "fontFamily" ||
    value.type === "image" ||
    value.type === "unit" ||
    value.type === "keyword" ||
    value.type === "unparsed" ||
    value.type === "invalid" ||
    value.type === "unset" ||
    value.type === "rgb"
  ) {
    callback(value);
    return;
  }
  if (value.type === "var") {
    for (const item of value.fallbacks) {
      traverseStyleValue(item, callback);
    }
    return;
  }
  if (value.type === "tuple" || value.type === "layers") {
    for (const item of value.value) {
      traverseStyleValue(item, callback);
    }
    return;
  }
  value satisfies never;
};

export const getInstancesSlice = (rootInstanceId: string) => {
  const assets = assetsStore.get();
  const instances = instancesStore.get();
  const dataSources = dataSourcesStore.get();
  const props = propsStore.get();
  const styleSourceSelections = styleSourceSelectionsStore.get();
  const styleSources = styleSourcesStore.get();
  const breakpoints = breakpointsStore.get();
  const styles = stylesStore.get();

  // collect the instance by id and all its descendants including portal instances
  const slicedInstanceIds = findTreeInstanceIds(instances, rootInstanceId);
  const slicedInstances: Instance[] = [];
  const slicedStyleSourceSelections: StyleSourceSelection[] = [];
  const slicedStyleSources: StyleSources = new Map();
  for (const instanceId of slicedInstanceIds) {
    const instance = instances.get(instanceId);
    if (instance) {
      slicedInstances.push(instance);
    }

    // collect all style sources bound to these instances
    const styleSourceSelection = styleSourceSelections.get(instanceId);
    if (styleSourceSelection) {
      slicedStyleSourceSelections.push(styleSourceSelection);
      for (const styleSourceId of styleSourceSelection.values) {
        if (slicedStyleSources.has(styleSourceId)) {
          continue;
        }
        const styleSource = styleSources.get(styleSourceId);
        if (styleSource === undefined) {
          continue;
        }
        slicedStyleSources.set(styleSourceId, styleSource);
      }
    }
  }

  const slicedAssetIds = new Set<Asset["id"]>();
  const slicedFontFamilies = new Set<string>();

  // collect styles bound to these style sources
  const slicedStyles: StyleDecl[] = [];
  const slicedBreapoints: Breakpoints = new Map();
  for (const styleDecl of styles.values()) {
    if (slicedStyleSources.has(styleDecl.styleSourceId) === false) {
      continue;
    }
    slicedStyles.push(styleDecl);

    // collect breakpoints
    if (slicedBreapoints.has(styleDecl.breakpointId) === false) {
      const breakpoint = breakpoints.get(styleDecl.breakpointId);
      if (breakpoint) {
        slicedBreapoints.set(styleDecl.breakpointId, breakpoint);
      }
    }

    // collect assets including fonts
    traverseStyleValue(styleDecl.value, (value) => {
      if (value.type === "fontFamily") {
        for (const fontFamily of value.value) {
          slicedFontFamilies.add(fontFamily);
        }
      }
      if (value.type === "image") {
        if (value.value.type === "asset") {
          slicedAssetIds.add(value.value.value);
        }
      }
    });
  }

  // collect props bound to these instances
  const slicedProps: Props = new Map();
  const usedDataSourceIds = new Set<DataSource["id"]>();
  for (const prop of props.values()) {
    if (slicedInstanceIds.has(prop.instanceId) === false) {
      continue;
    }

    slicedProps.set(prop.id, prop);

    if (prop.type === "dataSource") {
      const dataSource = dataSources.get(prop.value);
      if (dataSource?.type === "variable") {
        usedDataSourceIds.add(dataSource.id);
      }
      if (dataSource?.type === "expression") {
        usedDataSourceIds.add(dataSource.id);
        validateExpression(dataSource.code, {
          transformIdentifier(identifier) {
            const id = decodeDataSourceVariable(identifier);
            if (id !== undefined) {
              usedDataSourceIds.add(id);
            }
            return identifier;
          },
        });
      }
    }

    if (prop.type === "expression") {
      validateExpression(prop.value, {
        transformIdentifier(identifier) {
          const id = decodeDataSourceVariable(identifier);
          if (id !== undefined) {
            usedDataSourceIds.add(id);
          }
          return identifier;
        },
      });
    }

    if (prop.type === "action") {
      for (const value of prop.value) {
        if (value.type === "execute") {
          validateExpression(value.code, {
            effectful: true,
            transformIdentifier(identifier) {
              const id = decodeDataSourceVariable(identifier);
              if (id !== undefined) {
                usedDataSourceIds.add(id);
              }
              return identifier;
            },
          });
        }
      }
    }

    // collect assets
    if (prop.type === "asset") {
      slicedAssetIds.add(prop.value);
    }
  }

  // collect variables scoped to instances slice
  // or used by expressions or actions even outside of the tree
  // such variables can be bound to sliced root on paste
  const slicedDataSources: DataSources = new Map();
  for (const dataSource of dataSources.values()) {
    if (
      // check if data source itself can be copied
      (dataSource.scopeInstanceId !== undefined &&
        slicedInstanceIds.has(dataSource.scopeInstanceId)) ||
      usedDataSourceIds.has(dataSource.id)
    ) {
      slicedDataSources.set(dataSource.id, dataSource);
    }
  }

  const slicedAssets: Asset[] = [];
  for (const asset of assets.values()) {
    if (
      slicedAssetIds.has(asset.id) ||
      (asset.type === "font" && slicedFontFamilies.has(asset.meta.family))
    ) {
      slicedAssets.push(asset);
    }
  }

  return {
    instances: slicedInstances,
    styleSourceSelections: slicedStyleSourceSelections,
    styleSources: Array.from(slicedStyleSources.values()),
    breakpoints: Array.from(slicedBreapoints.values()),
    styles: slicedStyles,
    dataSources: Array.from(slicedDataSources.values()),
    props: Array.from(slicedProps.values()),
    assets: slicedAssets,
  };
};
