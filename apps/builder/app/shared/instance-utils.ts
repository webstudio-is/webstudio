import { nanoid } from "nanoid";
import { toast } from "@webstudio-is/design-system";
import { equalMedia, type StyleValue } from "@webstudio-is/css-engine";
import {
  type Instances,
  type StyleSource,
  getStyleDeclKey,
  findTreeInstanceIds,
  Instance,
  StyleSourceSelection,
  StyleDecl,
  Asset,
  StyleSources,
  Breakpoints,
  DataSources,
  Props,
  DataSource,
  Breakpoint,
  type WebstudioFragment,
  type WebstudioData,
  type Resource,
  findTreeInstanceIdsExcludingSlotDescendants,
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  transpileExpression,
  getExpressionIdentifiers,
  ROOT_INSTANCE_ID,
} from "@webstudio-is/sdk";
import {
  type WsComponentMeta,
  generateDataFromEmbedTemplate,
  portalComponent,
  collectionComponent,
} from "@webstudio-is/react-sdk";
import {
  $props,
  $styles,
  $styleSourceSelections,
  $styleSources,
  $instances,
  $registeredComponentMetas,
  $dataSources,
  $assets,
  $project,
  $breakpoints,
  $pages,
  $resources,
} from "./nano-states";
import {
  type DroppableTarget,
  type InstanceSelector,
  findLocalStyleSourcesWithinInstances,
  getAncestorInstanceSelector,
  insertPropsCopyMutable,
  getReparentDropTargetMutable,
  getInstanceOrCreateFragmentIfNecessary,
  wrapEditableChildrenAroundDropTargetMutable,
} from "./tree-utils";
import { removeByMutable } from "./array-utils";
import { isBaseBreakpoint } from "./breakpoints";
import { humanizeString } from "./string-utils";
import { serverSyncStore } from "./sync";
import { setDifference, setUnion } from "./shim";
import { breakCyclesMutable, findCycles } from "@webstudio-is/project-build";
import { $awareness, $selectedPage, selectInstance } from "./awareness";
import {
  findClosestNonTextualContainer,
  findClosestInstanceMatchingFragment,
  isTreeMatching,
} from "./matcher";

export const updateWebstudioData = (mutate: (data: WebstudioData) => void) => {
  serverSyncStore.createTransaction(
    [
      $pages,
      $instances,
      $props,
      $breakpoints,
      $styleSourceSelections,
      $styleSources,
      $styles,
      $dataSources,
      $resources,
      $assets,
    ],
    (
      pages,
      instances,
      props,
      breakpoints,
      styleSourceSelections,
      styleSources,
      styles,
      dataSources,
      resources,
      assets
    ) => {
      // @todo normalize pages
      if (pages === undefined) {
        return;
      }
      mutate({
        pages,
        instances,
        props,
        dataSources,
        resources,
        breakpoints,
        styleSourceSelections,
        styleSources,
        styles,
        assets,
      });

      const cycles = findCycles(instances.values());

      // Detect and fix cycles in the instance tree, then report
      if (cycles.length > 0) {
        toast.info("Detected and fixed cycles in the instance tree.");

        breakCyclesMutable(
          instances.values(),
          (node) => node.component === "Slot"
        );
      }
    }
  );
};

export const getWebstudioData = (): WebstudioData => {
  const pages = $pages.get();
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  return {
    pages,
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
    breakpoints: $breakpoints.get(),
    styleSourceSelections: $styleSourceSelections.get(),
    styleSources: $styleSources.get(),
    styles: $styles.get(),
    assets: $assets.get(),
  };
};

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

const isTextEditingInstance = (
  instance: Instance,
  instances: Instances,
  metas: Map<string, WsComponentMeta>
) => {
  // when start editing empty body all text content
  // including style and scripts appear in editor
  // assume body is root and stop checking further
  if (instance.component === "Body") {
    return false;
  }

  const meta = metas.get(instance.component);

  if (meta === undefined) {
    return false;
  }

  if (meta.type !== "container") {
    return false;
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

  return true;
};

export const findAllEditableInstanceSelector = (
  currentPath: InstanceSelector,
  instances: Map<string, Instance>,
  metas: Map<string, WsComponentMeta>,
  results: InstanceSelector[]
) => {
  const instanceId = currentPath[0];

  if (instanceId === undefined) {
    return;
  }

  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }

  // Check if current instance is text editing instance
  if (isTextEditingInstance(instance, instances, metas)) {
    results.push(currentPath);
    return;
  }

  // If not, traverse its children
  for (const child of instance.children) {
    if (child.type === "id") {
      findAllEditableInstanceSelector(
        [child.value, ...currentPath],
        instances,
        metas,
        results
      );
    }
  }

  return null;
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

    if (isTextEditingInstance(instance, instances, metas)) {
      return getAncestorInstanceSelector(instanceSelector, instanceId);
    }
  }
};

export const isInstanceDetachable = (
  instances: Instances,
  instanceSelector: InstanceSelector
) => {
  const metas = $registeredComponentMetas.get();
  const [instanceId, parentId] = instanceSelector;
  const newInstances = new Map(instances);
  // replace parent with the one without selected instance
  let parentInstance = newInstances.get(parentId);
  if (parentInstance) {
    parentInstance = {
      ...parentInstance,
      children: parentInstance.children.filter(
        (child) => child.type === "id" && child.value !== instanceId
      ),
    };
    newInstances.set(parentInstance.id, parentInstance);
  }
  // check parent can follow constraints without selected instance
  return isTreeMatching({
    instances: newInstances,
    metas,
    instanceSelector: instanceSelector.slice(1),
  });
};

export const insertInstanceChildrenMutable = (
  data: WebstudioData,
  children: Instance["children"],
  insertTarget: DroppableTarget
) => {
  const metas = $registeredComponentMetas.get();
  insertTarget =
    getInstanceOrCreateFragmentIfNecessary(data.instances, insertTarget) ??
    insertTarget;
  insertTarget =
    wrapEditableChildrenAroundDropTargetMutable(
      data.instances,
      data.props,
      metas,
      insertTarget
    ) ?? insertTarget;
  const [parentInstanceId] = insertTarget.parentSelector;
  const parentInstance = data.instances.get(parentInstanceId);
  if (parentInstance === undefined) {
    return;
  }
  const { position } = insertTarget;
  if (position === "end") {
    parentInstance.children.push(...children);
  } else {
    parentInstance.children.splice(position, 0, ...children);
  }
};

export const findTargetAndInsertFragment = (fragment: WebstudioFragment) => {
  let isSuccess = false;
  const insertable = findClosestInsertable(fragment);
  if (insertable === undefined) {
    return isSuccess;
  }

  updateWebstudioData((data) => {
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableDataSources: findAvailableDataSources(
        data.dataSources,
        data.instances,
        insertable.parentSelector
      ),
    });
    const newRootInstanceId = newInstanceIds.get(fragment.instances[0].id);
    if (newRootInstanceId === undefined) {
      isSuccess = false;
      return;
    }
    const children: Instance["children"] = [
      { type: "id", value: newRootInstanceId },
    ];
    insertInstanceChildrenMutable(data, children, insertable);
    isSuccess = true;
  });

  return isSuccess;
};

export const insertTemplateData = (
  templateData: WebstudioFragment,
  dropTarget: DroppableTarget
) => {
  const {
    children,
    instances: insertedInstances,
    props: insertedProps,
    dataSources: insertedDataSources,
  } = templateData;
  const rootInstanceId = insertedInstances[0].id;
  updateWebstudioData((data) => {
    const {
      instances,
      dataSources,
      props,
      styleSourceSelections,
      styleSources,
      styles,
    } = data;
    for (const instance of insertedInstances) {
      instances.set(instance.id, instance);
    }
    insertInstanceChildrenMutable(data, children, dropTarget);
    insertPropsCopyMutable(props, insertedProps, new Map());
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
  });

  selectInstance([rootInstanceId, ...dropTarget.parentSelector]);
};

export const getComponentTemplateData = (component: string) => {
  const metas = $registeredComponentMetas.get();
  const componentMeta = metas.get(component);
  // when template not specified fallback to template with the component
  const template = componentMeta?.template ?? [
    {
      type: "instance",
      component,
      children: [],
    },
  ];
  const breakpoints = $breakpoints.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return;
  }
  return generateDataFromEmbedTemplate(template, metas, baseBreakpoint.id);
};

export const reparentInstance = (
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  const [rootInstanceId] = sourceInstanceSelector;
  updateWebstudioData((data) => {
    const fragment = extractWebstudioFragment(data, rootInstanceId);
    const reparentDropTarget = getReparentDropTargetMutable(
      data.instances,
      data.props,
      $registeredComponentMetas.get(),
      sourceInstanceSelector,
      dropTarget
    );
    if (reparentDropTarget === undefined) {
      return;
    }
    deleteInstanceMutable(data, sourceInstanceSelector);
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableDataSources: findAvailableDataSources(
        data.dataSources,
        data.instances,
        reparentDropTarget.parentSelector
      ),
    });
    const newRootInstanceId = newInstanceIds.get(rootInstanceId);
    if (newRootInstanceId === undefined) {
      return;
    }
    const [newParentId] = reparentDropTarget.parentSelector;
    const newParent = data.instances.get(newParentId);
    if (newParent === undefined) {
      return;
    }
    const newChild = { type: "id" as const, value: newRootInstanceId };
    if (reparentDropTarget.position === "end") {
      newParent.children.push(newChild);
    } else {
      newParent.children.splice(reparentDropTarget.position, 0, newChild);
    }
    selectInstance([newRootInstanceId, ...reparentDropTarget.parentSelector]);
  });
};

export const deleteInstanceMutable = (
  data: WebstudioData,
  instanceSelector: InstanceSelector
) => {
  const {
    instances,
    props,
    styleSourceSelections,
    styleSources,
    styles,
    dataSources,
    resources,
  } = data;
  let targetInstanceId = instanceSelector[0];
  const parentInstanceId = instanceSelector[1];
  let parentInstance =
    parentInstanceId === undefined
      ? undefined
      : instances.get(parentInstanceId);
  const grandparentInstanceId = instanceSelector[2];
  const grandparentInstance = instances.get(grandparentInstanceId);

  // delete parent fragment too if its last child is going to be deleted
  // use case for slots: slot became empty and remove display: contents
  // to be displayed properly on canvas
  if (
    parentInstance?.component === "Fragment" &&
    parentInstance.children.length === 1 &&
    grandparentInstance
  ) {
    targetInstanceId = parentInstance.id;
    parentInstance = grandparentInstance;
  }

  // skip parent fake "item" instance and use grandparent collection as parent
  if (grandparentInstance?.component === collectionComponent) {
    parentInstance = grandparentInstance;
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
      if (dataSource.type === "resource") {
        resources.delete(dataSource.resourceId);
      }
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
    value.type === "rgb" ||
    value.type === "function" ||
    value.type === "guaranteedInvalid"
  ) {
    callback(value);
    return;
  }
  if (value.type === "var") {
    if (value.fallback) {
      traverseStyleValue(value.fallback, callback);
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

const collectUsedDataSources = (
  expression: string,
  usedDataSourceIds: Set<DataSource["id"]>
) => {
  const identifiers = getExpressionIdentifiers(expression);
  for (const identifier of identifiers) {
    const id = decodeDataSourceVariable(identifier);
    if (id !== undefined) {
      usedDataSourceIds.add(id);
    }
  }
};

export const extractWebstudioFragment = (
  data: WebstudioData,
  rootInstanceId: string
): WebstudioFragment => {
  const {
    assets,
    instances,
    dataSources,
    resources,
    props,
    styleSourceSelections,
    styleSources,
    breakpoints,
    styles,
  } = data;

  // collect the instance by id and all its descendants including portal instances
  const fragmentInstanceIds = findTreeInstanceIds(instances, rootInstanceId);
  const fragmentInstances: Instance[] = [];
  const fragmentStyleSourceSelections: StyleSourceSelection[] = [];
  const fragmentStyleSources: StyleSources = new Map();
  const usedDataSourceIds = new Set<DataSource["id"]>();
  for (const instanceId of fragmentInstanceIds) {
    const instance = instances.get(instanceId);
    if (instance) {
      fragmentInstances.push(instance);
      for (const child of instance.children) {
        if (child.type === "expression") {
          collectUsedDataSources(child.value, usedDataSourceIds);
        }
      }
    }

    // collect all style sources bound to these instances
    const styleSourceSelection = styleSourceSelections.get(instanceId);
    if (styleSourceSelection) {
      fragmentStyleSourceSelections.push(styleSourceSelection);
      for (const styleSourceId of styleSourceSelection.values) {
        if (fragmentStyleSources.has(styleSourceId)) {
          continue;
        }
        const styleSource = styleSources.get(styleSourceId);
        if (styleSource === undefined) {
          continue;
        }
        fragmentStyleSources.set(styleSourceId, styleSource);
      }
    }
  }

  const fragmentAssetIds = new Set<Asset["id"]>();
  const fragmentFontFamilies = new Set<string>();

  // collect styles bound to these style sources
  const fragmentStyles: StyleDecl[] = [];
  const fragmentBreapoints: Breakpoints = new Map();
  for (const styleDecl of styles.values()) {
    if (fragmentStyleSources.has(styleDecl.styleSourceId) === false) {
      continue;
    }
    fragmentStyles.push(styleDecl);

    // collect breakpoints
    if (fragmentBreapoints.has(styleDecl.breakpointId) === false) {
      const breakpoint = breakpoints.get(styleDecl.breakpointId);
      if (breakpoint) {
        fragmentBreapoints.set(styleDecl.breakpointId, breakpoint);
      }
    }

    // collect assets including fonts
    traverseStyleValue(styleDecl.value, (value) => {
      if (value.type === "fontFamily") {
        for (const fontFamily of value.value) {
          fragmentFontFamilies.add(fontFamily);
        }
      }
      if (value.type === "image") {
        if (value.value.type === "asset") {
          fragmentAssetIds.add(value.value.value);
        }
      }
    });
  }

  // collect props bound to these instances
  const fragmentProps: Props = new Map();
  for (const prop of props.values()) {
    if (fragmentInstanceIds.has(prop.instanceId) === false) {
      continue;
    }

    fragmentProps.set(prop.id, prop);

    if (prop.type === "expression") {
      collectUsedDataSources(prop.value, usedDataSourceIds);
    }

    if (prop.type === "action") {
      for (const value of prop.value) {
        if (value.type === "execute") {
          collectUsedDataSources(value.code, usedDataSourceIds);
        }
      }
    }

    // collect assets
    if (prop.type === "asset") {
      fragmentAssetIds.add(prop.value);
    }
  }

  // collect variables scoped to fragment instances
  // or used by expressions or actions even outside of the tree
  // such variables can be bound to fragment root on paste
  const fragmentDataSources: DataSources = new Map();
  const fragmentResourceIds = new Set<Resource["id"]>();
  for (const dataSource of dataSources.values()) {
    if (
      // check if data source itself can be copied
      (dataSource.scopeInstanceId !== undefined &&
        fragmentInstanceIds.has(dataSource.scopeInstanceId)) ||
      usedDataSourceIds.has(dataSource.id)
    ) {
      fragmentDataSources.set(dataSource.id, dataSource);
      if (dataSource.type === "resource") {
        fragmentResourceIds.add(dataSource.resourceId);
      }
    }
  }

  // collect resources bound to all fragment data sources
  // and then collect data sources used in these resources
  // it creates some recursive behavior but since resources
  // cannot depend on other resources all left data sources
  // can be collected just once
  const fragmentResources: Resource[] = [];
  const dataSourceIdsUsedInResources = new Set<DataSource["id"]>();
  for (const resourceId of fragmentResourceIds) {
    const resource = resources.get(resourceId);
    if (resource === undefined) {
      continue;
    }
    fragmentResources.push(resource);
    collectUsedDataSources(resource.url, dataSourceIdsUsedInResources);
    for (const { value } of resource.headers) {
      collectUsedDataSources(value, dataSourceIdsUsedInResources);
    }
    if (resource.body) {
      collectUsedDataSources(resource.body, dataSourceIdsUsedInResources);
    }
  }
  for (const dataSource of dataSources.values()) {
    if (dataSourceIdsUsedInResources.has(dataSource.id)) {
      fragmentDataSources.set(dataSource.id, dataSource);
    }
  }

  const fragmentAssets: Asset[] = [];
  for (const asset of assets.values()) {
    if (
      fragmentAssetIds.has(asset.id) ||
      (asset.type === "font" && fragmentFontFamilies.has(asset.meta.family))
    ) {
      fragmentAssets.push(asset);
    }
  }

  return {
    children: [{ type: "id", value: rootInstanceId }],
    instances: fragmentInstances,
    styleSourceSelections: fragmentStyleSourceSelections,
    styleSources: Array.from(fragmentStyleSources.values()),
    breakpoints: Array.from(fragmentBreapoints.values()),
    styles: fragmentStyles,
    dataSources: Array.from(fragmentDataSources.values()),
    resources: fragmentResources,
    props: Array.from(fragmentProps.values()),
    assets: fragmentAssets,
  };
};

export const findAvailableDataSources = (
  dataSources: DataSources,
  instances: Instances,
  instanceSelector: InstanceSelector
) => {
  // inline data sources not scoped to current portal
  const instanceIds = new Set();
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (instance?.component === portalComponent) {
      break;
    }
    instanceIds.add(instanceId);
  }
  const availableDataSources = new Set<DataSource["id"]>();
  for (const { id, scopeInstanceId } of dataSources.values()) {
    if (scopeInstanceId && instanceIds.has(scopeInstanceId)) {
      availableDataSources.add(id);
    }
  }
  return availableDataSources;
};

const inlineUnavailableDataSources = ({
  code,
  availableDataSources,
  dataSources,
}: {
  code: string;
  availableDataSources: Set<DataSource["id"]>;
  dataSources: DataSources;
}) => {
  let isDiscarded = false;
  const newCode = transpileExpression({
    expression: code,
    replaceVariable: (identifier, assignee) => {
      const dataSourceId = decodeDataSourceVariable(identifier);
      if (
        dataSourceId === undefined ||
        availableDataSources.has(dataSourceId)
      ) {
        return;
      }
      // left operand of assign operator cannot be inlined
      if (assignee) {
        isDiscarded = true;
      }
      const dataSource = dataSources.get(dataSourceId);
      // inline variable not scoped to portal content instances
      if (dataSource?.type === "variable") {
        return JSON.stringify(dataSource.value.value);
      }
      return "{}";
    },
  });
  return { code: newCode, isDiscarded };
};

const replaceDataSources = (
  code: string,
  replacements: Map<DataSource["id"], DataSource["id"]>
) => {
  return transpileExpression({
    expression: code,
    replaceVariable: (identifier) => {
      const dataSourceId = decodeDataSourceVariable(identifier);
      if (dataSourceId === undefined) {
        return;
      }
      return encodeDataSourceVariable(
        replacements.get(dataSourceId) ?? dataSourceId
      );
    },
  });
};

export const insertWebstudioFragmentCopy = ({
  data,
  fragment,
  availableDataSources,
}: {
  data: WebstudioData;
  fragment: WebstudioFragment;
  availableDataSources: Set<DataSource["id"]>;
}) => {
  const newInstanceIds = new Map<Instance["id"], Instance["id"]>();
  const newDataSourceIds = new Map<DataSource["id"], DataSource["id"]>();
  const newDataIds = {
    newInstanceIds,
    newDataSourceIds,
  };
  const projectId = $project.get()?.id;
  if (projectId === undefined) {
    return newDataIds;
  }

  const fragmentInstances: Instances = new Map();
  const portalContentRootIds = new Set<Instance["id"]>();
  for (const instance of fragment.instances) {
    fragmentInstances.set(instance.id, instance);
    if (instance.component === portalComponent) {
      for (const child of instance.children) {
        if (child.type === "id") {
          portalContentRootIds.add(child.value);
        }
      }
    }
  }

  const fragmentDataSources: DataSources = new Map();
  for (const dataSource of fragment.dataSources) {
    fragmentDataSources.set(dataSource.id, dataSource);
  }

  const {
    assets,
    instances,
    resources,
    dataSources,
    props,
    breakpoints,
    styleSources,
    styles,
    styleSourceSelections,
  } = data;

  /**
   * insert reusables without changing their ids to not bloat data
   * and catch up with user changes
   * - assets
   * - breakpoints
   * - token styles
   * - portals
   *
   * breakpoints behave slightly differently and merged with existing ones
   * and those ids are used instead
   */

  // insert assets

  for (const asset of fragment.assets) {
    // asset can be already present if pasting to the same project
    if (assets.has(asset.id) === false) {
      // we use the same asset.id so the references are preserved
      assets.set(asset.id, { ...asset, projectId });
    }
  }

  // merge breakpoints

  const mergedBreakpointIds = new Map<Breakpoint["id"], Breakpoint["id"]>();
  for (const newBreakpoint of fragment.breakpoints) {
    let matched = false;
    for (const breakpoint of breakpoints.values()) {
      if (equalMedia(breakpoint, newBreakpoint)) {
        matched = true;
        mergedBreakpointIds.set(newBreakpoint.id, breakpoint.id);
        break;
      }
    }
    if (matched === false) {
      breakpoints.set(newBreakpoint.id, newBreakpoint);
    }
  }

  // insert tokens with their styles

  const tokenStyleSourceIds = new Set<StyleSource["id"]>();
  for (const styleSource of fragment.styleSources) {
    // prevent inserting styles when token is already present
    if (styleSource.type === "local" || styleSources.has(styleSource.id)) {
      continue;
    }
    styleSource.type satisfies "token";
    tokenStyleSourceIds.add(styleSource.id);
    styleSources.set(styleSource.id, styleSource);
  }
  for (const styleDecl of fragment.styles) {
    if (tokenStyleSourceIds.has(styleDecl.styleSourceId)) {
      const { breakpointId } = styleDecl;
      const newStyleDecl: StyleDecl = {
        ...styleDecl,
        breakpointId: mergedBreakpointIds.get(breakpointId) ?? breakpointId,
      };
      styles.set(getStyleDeclKey(newStyleDecl), newStyleDecl);
    }
  }

  let portalContentIds = new Set<Instance["id"]>();

  // insert portal contents
  // - instances
  // - data sources
  // - props
  // - local styles
  for (const rootInstanceId of portalContentRootIds) {
    const instanceIds = findTreeInstanceIdsExcludingSlotDescendants(
      fragmentInstances,
      rootInstanceId
    );
    portalContentIds = setUnion(portalContentIds, instanceIds);

    // prevent reinserting portals which could be already changed by user
    if (instances.has(rootInstanceId)) {
      continue;
    }

    const availablePortalDataSources = new Set(availableDataSources);
    const usedResourceIds = new Set<Resource["id"]>();
    for (const dataSource of fragment.dataSources) {
      // insert only data sources within portal content
      if (
        dataSource.scopeInstanceId &&
        instanceIds.has(dataSource.scopeInstanceId)
      ) {
        availablePortalDataSources.add(dataSource.id);
        dataSources.set(dataSource.id, dataSource);
        if (dataSource.type === "resource") {
          usedResourceIds.add(dataSource.resourceId);
        }
      }
    }

    for (const resource of fragment.resources) {
      if (usedResourceIds.has(resource.id) === false) {
        continue;
      }
      const newUrl = inlineUnavailableDataSources({
        code: resource.url,
        availableDataSources: availablePortalDataSources,
        dataSources: fragmentDataSources,
      }).code;
      const newHeaders = resource.headers.map((header) => ({
        name: header.name,
        value: inlineUnavailableDataSources({
          code: header.value,
          availableDataSources: availablePortalDataSources,
          dataSources: fragmentDataSources,
        }).code,
      }));
      const newBody =
        resource.body === undefined
          ? undefined
          : inlineUnavailableDataSources({
              code: resource.body,
              availableDataSources: availablePortalDataSources,
              dataSources: fragmentDataSources,
            }).code;
      resources.set(resource.id, {
        ...resource,
        url: newUrl,
        headers: newHeaders,
        body: newBody,
      });
    }

    for (const instance of fragment.instances) {
      if (instanceIds.has(instance.id)) {
        instances.set(instance.id, {
          ...instance,
          children: instance.children.map((child) => {
            if (child.type === "expression") {
              const { code } = inlineUnavailableDataSources({
                code: child.value,
                availableDataSources: availablePortalDataSources,
                dataSources: fragmentDataSources,
              });
              return {
                type: "expression",
                value: code,
              };
            }
            return child;
          }),
        });
      }
    }

    for (let prop of fragment.props) {
      if (instanceIds.has(prop.instanceId) === false) {
        continue;
      }
      // inline data sources not available in scope into expressions
      if (prop.type === "expression") {
        const { code } = inlineUnavailableDataSources({
          code: prop.value,
          availableDataSources: availablePortalDataSources,
          dataSources: fragmentDataSources,
        });
        prop = { ...prop, value: code };
      }
      if (prop.type === "action") {
        prop = {
          ...prop,
          value: prop.value.flatMap((value) => {
            if (value.type !== "execute") {
              return [value];
            }
            const { code, isDiscarded } = inlineUnavailableDataSources({
              code: value.code,
              availableDataSources: availablePortalDataSources,
              dataSources: fragmentDataSources,
            });
            if (isDiscarded) {
              return [];
            }
            return [{ ...value, code }];
          }),
        };
      }
      props.set(prop.id, prop);
    }

    // insert local style sources with their styles

    const instanceStyleSourceIds = new Set<StyleSource["id"]>();
    for (const styleSourceSelection of fragment.styleSourceSelections) {
      const { instanceId } = styleSourceSelection;
      if (instanceIds.has(instanceId) === false) {
        continue;
      }
      styleSourceSelections.set(instanceId, styleSourceSelection);
      for (const styleSourceId of styleSourceSelection.values) {
        instanceStyleSourceIds.add(styleSourceId);
      }
    }
    const localStyleSourceIds = new Set<StyleSource["id"]>();
    for (const styleSource of fragment.styleSources) {
      if (
        styleSource.type === "local" &&
        instanceStyleSourceIds.has(styleSource.id)
      ) {
        localStyleSourceIds.add(styleSource.id);
        styleSources.set(styleSource.id, styleSource);
      }
    }
    for (const styleDecl of fragment.styles) {
      if (localStyleSourceIds.has(styleDecl.styleSourceId)) {
        const { breakpointId } = styleDecl;
        const newStyleDecl: StyleDecl = {
          ...styleDecl,
          breakpointId: mergedBreakpointIds.get(breakpointId) ?? breakpointId,
        };
        styles.set(getStyleDeclKey(newStyleDecl), newStyleDecl);
      }
    }
  }

  /**
   * inserting unique content is structurally similar to inserting portal content
   * but all ids are regenerated to support duplicating existing content
   * - instances
   * - data sources
   * - props
   * - local styles
   */

  // generate new ids only instances outside of portals
  const fragmentInstanceIds = setDifference(
    new Set(fragmentInstances.keys()),
    portalContentIds
  );
  for (const instanceId of fragmentInstanceIds) {
    newInstanceIds.set(instanceId, nanoid());
  }
  fragmentInstanceIds.add(ROOT_INSTANCE_ID);
  newInstanceIds.set(ROOT_INSTANCE_ID, ROOT_INSTANCE_ID);

  const availableFragmentDataSources = new Set(availableDataSources);
  const newResourceIds = new Map<Resource["id"], Resource["id"]>();
  const usedResourceIds = new Set<Resource["id"]>();
  for (const dataSource of fragment.dataSources) {
    const { scopeInstanceId } = dataSource;
    // insert only data sources within portal content
    if (scopeInstanceId && fragmentInstanceIds.has(scopeInstanceId)) {
      availableFragmentDataSources.add(dataSource.id);
      const newDataSourceId = nanoid();
      newDataSourceIds.set(dataSource.id, newDataSourceId);
      if (dataSource.type === "resource") {
        const newResourceId = nanoid();
        newResourceIds.set(dataSource.resourceId, newResourceId);
        usedResourceIds.add(dataSource.resourceId);
        dataSources.set(newDataSourceId, {
          ...dataSource,
          id: newDataSourceId,
          scopeInstanceId: newInstanceIds.get(scopeInstanceId),
          resourceId: newResourceId,
        });
      } else {
        dataSources.set(newDataSourceId, {
          ...dataSource,
          id: newDataSourceId,
          scopeInstanceId: newInstanceIds.get(scopeInstanceId),
        });
      }
    }
  }

  for (const resource of fragment.resources) {
    if (usedResourceIds.has(resource.id) === false) {
      continue;
    }
    const newResourceId = newResourceIds.get(resource.id) ?? resource.id;

    const newUrl = replaceDataSources(
      inlineUnavailableDataSources({
        code: resource.url,
        availableDataSources: availableFragmentDataSources,
        dataSources: fragmentDataSources,
      }).code,
      newDataSourceIds
    );
    const newHeaders = resource.headers.map((header) => ({
      name: header.name,
      value: replaceDataSources(
        inlineUnavailableDataSources({
          code: header.value,
          availableDataSources: availableFragmentDataSources,
          dataSources: fragmentDataSources,
        }).code,
        newDataSourceIds
      ),
    }));
    const newBody =
      resource.body === undefined
        ? undefined
        : replaceDataSources(
            inlineUnavailableDataSources({
              code: resource.body,
              availableDataSources: availableFragmentDataSources,
              dataSources: fragmentDataSources,
            }).code,
            newDataSourceIds
          );
    resources.set(newResourceId, {
      ...resource,
      id: newResourceId,
      url: newUrl,
      headers: newHeaders,
      body: newBody,
    });
  }

  for (const instance of fragment.instances) {
    if (fragmentInstanceIds.has(instance.id)) {
      const newId = newInstanceIds.get(instance.id) ?? instance.id;
      instances.set(newId, {
        ...instance,
        id: newId,
        children: instance.children.map((child) => {
          if (child.type === "id") {
            return {
              type: "id",
              value: newInstanceIds.get(child.value) ?? child.value,
            };
          }
          if (child.type === "expression") {
            const { code } = inlineUnavailableDataSources({
              code: child.value,
              availableDataSources: availableFragmentDataSources,
              dataSources: fragmentDataSources,
            });
            return {
              type: "expression",
              value: replaceDataSources(code, newDataSourceIds),
            };
          }
          return child;
        }),
      });
    }
  }

  for (let prop of fragment.props) {
    if (fragmentInstanceIds.has(prop.instanceId) === false) {
      continue;
    }
    // inline data sources not available in scope into expressions
    if (prop.type === "expression") {
      const { code } = inlineUnavailableDataSources({
        code: prop.value,
        availableDataSources: availableFragmentDataSources,
        dataSources: fragmentDataSources,
      });
      prop = { ...prop, value: replaceDataSources(code, newDataSourceIds) };
    }
    if (prop.type === "action") {
      prop = {
        ...prop,
        value: prop.value.flatMap((value) => {
          if (value.type !== "execute") {
            return [value];
          }
          const { code, isDiscarded } = inlineUnavailableDataSources({
            code: value.code,
            availableDataSources: availableFragmentDataSources,
            dataSources: fragmentDataSources,
          });
          if (isDiscarded) {
            return [];
          }
          return [
            { ...value, code: replaceDataSources(code, newDataSourceIds) },
          ];
        }),
      };
    }
    if (prop.type === "parameter") {
      prop = {
        ...prop,
        value: newDataSourceIds.get(prop.value) ?? prop.value,
      };
    }
    const newId = nanoid();
    props.set(newId, {
      ...prop,
      id: newId,
      instanceId: newInstanceIds.get(prop.instanceId) ?? prop.instanceId,
    });
  }

  // insert local styles with new ids

  const newLocalStyleSources = new Map();
  for (const styleSource of fragment.styleSources) {
    if (styleSource.type === "local") {
      newLocalStyleSources.set(styleSource.id, styleSource);
    }
  }

  const newLocalStyleSourceIds = new Map<
    StyleSource["id"],
    StyleSource["id"]
  >();
  for (const { instanceId, values } of fragment.styleSourceSelections) {
    if (fragmentInstanceIds.has(instanceId) === false) {
      continue;
    }

    const existingStyleSourceIds =
      styleSourceSelections.get(instanceId)?.values ?? [];
    let existingLocalStyleSource;
    for (const styleSourceId of existingStyleSourceIds) {
      const styleSource = styleSources.get(styleSourceId);
      if (styleSource?.type === "local") {
        existingLocalStyleSource = styleSource;
      }
    }
    const newStyleSourceIds = [];
    for (let styleSourceId of values) {
      const newLocalStyleSource = newLocalStyleSources.get(styleSourceId);
      if (newLocalStyleSource) {
        // merge only :root styles and duplicate others
        if (instanceId === ROOT_INSTANCE_ID && existingLocalStyleSource) {
          // write local styles into existing local style source
          styleSourceId = existingLocalStyleSource.id;
        } else {
          // create new local styles
          const newId = nanoid();
          styleSources.set(newId, { ...newLocalStyleSource, id: newId });
          styleSourceId = newId;
        }
        newLocalStyleSourceIds.set(newLocalStyleSource.id, styleSourceId);
      }
      newStyleSourceIds.push(styleSourceId);
    }
    const newInstanceId = newInstanceIds.get(instanceId) ?? instanceId;
    styleSourceSelections.set(newInstanceId, {
      instanceId: newInstanceId,
      values: newStyleSourceIds,
    });
  }

  for (const styleDecl of fragment.styles) {
    const { breakpointId, styleSourceId } = styleDecl;
    if (newLocalStyleSourceIds.has(styleDecl.styleSourceId)) {
      const newStyleDecl: StyleDecl = {
        ...styleDecl,
        styleSourceId:
          newLocalStyleSourceIds.get(styleSourceId) ?? styleSourceId,
        breakpointId: mergedBreakpointIds.get(breakpointId) ?? breakpointId,
      };
      styles.set(getStyleDeclKey(newStyleDecl), newStyleDecl);
    }
  }

  return newDataIds;
};

export const findClosestSlot = (
  instances: Instances,
  instanceSelector: InstanceSelector
) => {
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (instance?.component === "Slot") {
      return instance;
    }
  }
};

export type Insertable = {
  parentSelector: InstanceSelector;
  position: number | "end";
};

export const findClosestInsertable = (
  fragment: WebstudioFragment
): undefined | Insertable => {
  const selectedPage = $selectedPage.get();
  const awareness = $awareness.get();
  if (selectedPage === undefined) {
    return;
  }
  // paste to the page root if nothing is selected
  const instanceSelector = awareness?.instanceSelector ?? [
    selectedPage.rootInstanceId,
  ];
  if (instanceSelector[0] === ROOT_INSTANCE_ID) {
    toast.error(`Cannot insert into Global Root`);
    return;
  }
  const metas = $registeredComponentMetas.get();
  const instances = $instances.get();
  const closestContainerIndex = findClosestNonTextualContainer({
    metas,
    instances,
    instanceSelector,
  });
  if (closestContainerIndex === -1) {
    return;
  }
  let insertableIndex = findClosestInstanceMatchingFragment({
    metas,
    instances,
    instanceSelector: instanceSelector.slice(closestContainerIndex),
    fragment,
    onError: (message) => toast.error(message),
  });
  if (insertableIndex === -1) {
    return;
  }

  // adjust with container lookup
  insertableIndex = insertableIndex + closestContainerIndex;
  const parentSelector = instanceSelector.slice(insertableIndex);
  if (insertableIndex === 0) {
    return {
      parentSelector,
      position: "end",
    };
  }
  const instance = instances.get(instanceSelector[insertableIndex]);
  if (instance === undefined) {
    return;
  }
  // skip collection item when inserting something and go straight into collection instance
  if (instance?.component === collectionComponent && insertableIndex === 1) {
    return {
      parentSelector,
      position: "end",
    };
  }
  const lastChildInstanceId = instanceSelector[insertableIndex - 1];
  const lastChildPosition = instance.children.findIndex(
    (child) => child.type === "id" && child.value === lastChildInstanceId
  );
  return {
    parentSelector,
    position: lastChildPosition + 1,
  };
};
