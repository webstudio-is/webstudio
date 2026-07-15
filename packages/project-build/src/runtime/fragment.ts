// Fragment utilities own extracting, copying, and conflict-checking portable
// Webstudio fragments. Put serialization-style instance subtree cloning and
// fragment asset/style/data remapping here, not live tree placement decisions.
import { nanoid } from "nanoid";
import {
  type Asset,
  type Breakpoints,
  type DataSource,
  type DataSources,
  type Instance,
  type Instances,
  type Prop,
  type Resource,
  type StyleDecl,
  type WsComponentMeta,
  type WebstudioData,
  type WebstudioFragment,
  ROOT_INSTANCE_ID,
  findPageByIdOrPath,
  findTreeInstanceIds,
  findTreeInstanceIdsExcludingSlotDescendants,
  getHomePage,
  portalComponent,
} from "@webstudio-is/sdk";
import {
  findAvailableVariables,
  replaceDataSourcesInExpression,
  restoreExpressionVariables,
  unsetExpressionVariables,
} from "./data";
import { cloneInstanceWithNewIds } from "./instances";
import { clonePropForInstance, listPropExpressions } from "./props";
import { buildMergedBreakpointIds, maxBreakpoints } from "./breakpoints";
import {
  collectStyleSourcesFromInstances,
  detectTokenConflicts,
  insertLocalStyleSourcesWithNewIds,
  insertPortalLocalStyleSources,
  insertTokenStyleSources,
  type ConflictResolution,
} from "./style-copy";
import { unwrap } from "./unwrap";
import {
  collectFontFamiliesFromStyleValue,
  traverseStyleValue,
} from "./style-utils";

export type ContentModeCopyableProp = (input: {
  prop: Prop;
  fragment: WebstudioFragment;
  fragmentInstances: Instances;
  styleSources: WebstudioData["styleSources"];
  metas: Map<string, WsComponentMeta>;
}) => boolean;

export type FragmentInsertTarget = {
  parentSelector: Instance["id"][];
  position: number | "end" | "after";
};

export const listFragmentExpressions = (fragment: WebstudioFragment) => [
  ...fragment.instances.flatMap((instance, instanceIndex) =>
    instance.children.flatMap((child, childIndex) =>
      child.type === "expression"
        ? [
            {
              expression: child.value,
              allowAssignment: false,
              variables: [] as string[],
              path: [
                "instances",
                String(instanceIndex),
                "children",
                String(childIndex),
                "value",
              ],
            },
          ]
        : []
    )
  ),
  ...fragment.props.flatMap((prop, propIndex) =>
    listPropExpressions(prop).map((entry) => ({
      ...entry,
      path: ["props", String(propIndex), "value", ...entry.path],
    }))
  ),
];

const mergeById = <Item extends { id: string }>(items: Item[]) =>
  Array.from(new Map(items.map((item) => [item.id, item])).values());

const mergeUniqueByJson = <Item>(items: Item[]) =>
  Array.from(
    new Map(items.map((item) => [JSON.stringify(item), item])).values()
  );

export const mergeWebstudioFragments = (
  rootInstanceIds: Instance["id"][],
  fragments: WebstudioFragment[]
): WebstudioFragment => ({
  children: rootInstanceIds.map((instanceId) => ({
    type: "id" as const,
    value: instanceId,
  })),
  instances: mergeById(fragments.flatMap((fragment) => fragment.instances)),
  styleSourceSelections: mergeUniqueByJson(
    fragments.flatMap((fragment) => fragment.styleSourceSelections)
  ),
  styleSources: mergeById(
    fragments.flatMap((fragment) => fragment.styleSources)
  ),
  breakpoints: mergeById(fragments.flatMap((fragment) => fragment.breakpoints)),
  styles: mergeUniqueByJson(fragments.flatMap((fragment) => fragment.styles)),
  dataSources: mergeById(fragments.flatMap((fragment) => fragment.dataSources)),
  resources: mergeById(fragments.flatMap((fragment) => fragment.resources)),
  props: mergeById(fragments.flatMap((fragment) => fragment.props)),
  assets: mergeById(fragments.flatMap((fragment) => fragment.assets)),
});

export const getPasteRootInstanceIds = ({
  rootInstanceIds,
  fragment,
}: {
  rootInstanceIds: Instance["id"][];
  fragment: WebstudioFragment;
}) => {
  const instanceIds = new Set(
    fragment.instances.map((instance) => instance.id)
  );
  const fragmentRootIds = new Set<Instance["id"]>();
  for (const child of fragment.children) {
    if (child.type === "id") {
      fragmentRootIds.add(child.value);
    }
  }
  const seen = new Set<Instance["id"]>();
  return rootInstanceIds.filter((instanceId) => {
    if (
      instanceIds.has(instanceId) === false ||
      fragmentRootIds.has(instanceId) === false ||
      seen.has(instanceId)
    ) {
      return false;
    }
    seen.add(instanceId);
    return true;
  });
};

export const getCommonAncestorSelector = (
  instanceSelectors: Instance["id"][][]
): undefined | Instance["id"][] => {
  const [firstSelector] = instanceSelectors;
  if (firstSelector === undefined) {
    return;
  }
  const ancestorSelector: Instance["id"][] = [];
  for (let index = 1; index <= firstSelector.length; index += 1) {
    const ancestorId = firstSelector[firstSelector.length - index];
    if (
      instanceSelectors.every(
        (selector) => selector[selector.length - index] === ancestorId
      )
    ) {
      ancestorSelector.unshift(ancestorId);
      continue;
    }
    break;
  }
  return ancestorSelector.length > 0 ? ancestorSelector : undefined;
};

export const getPortalFragmentSelector = (
  instances: Instances,
  instanceSelector: Instance["id"][]
) => {
  const instance = instances.get(instanceSelector[0]);
  if (
    instance?.component !== portalComponent ||
    instance.children.length === 0 ||
    instance.children[0].type !== "id"
  ) {
    return;
  }
  return [instance.children[0].value, ...instanceSelector];
};

export const findSafeFragmentPasteTarget = ({
  fragment,
  instances,
  insertTarget,
}: {
  fragment: WebstudioFragment;
  instances: Instances;
  insertTarget: FragmentInsertTarget;
}): undefined | FragmentInsertTarget => {
  if (fragment.instances.length === 0) {
    return;
  }

  const fragmentInstances: Instances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const copiedRootInstanceIds = new Set<Instance["id"]>();
  for (const child of fragment.children) {
    if (child.type !== "id") {
      continue;
    }
    for (const instanceId of findTreeInstanceIdsExcludingSlotDescendants(
      fragmentInstances,
      child.value
    )) {
      copiedRootInstanceIds.add(instanceId);
    }
  }

  const preservedChildIds = new Set<Instance["id"]>();
  for (const instance of fragment.instances) {
    for (const child of instance.children) {
      if (
        child.type === "id" &&
        copiedRootInstanceIds.has(child.value) === false
      ) {
        preservedChildIds.add(child.value);
      }
    }
  }

  const dropTargetSelector =
    getPortalFragmentSelector(instances, insertTarget.parentSelector) ??
    insertTarget.parentSelector;
  for (const instanceId of dropTargetSelector) {
    if (preservedChildIds.has(instanceId)) {
      return;
    }
  }

  return insertTarget;
};

const setDifference = <Item>(current: Set<Item>, other: Set<Item>) => {
  const result = new Set<Item>(current);
  for (const item of other) {
    result.delete(item);
  }
  return result;
};

const setUnion = <Item>(current: Set<Item>, other: Set<Item>) => {
  const result = new Set<Item>(current);
  for (const item of other) {
    result.add(item);
  }
  return result;
};

export const extractWebstudioFragment = (
  data: Omit<WebstudioData, "pages">,
  rootInstanceId: string,
  options: { unsetVariables?: Set<DataSource["id"]> } = {}
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
  let fragmentInstances: Instance[] = [];

  // Collect style sources and selections from instances
  const {
    styleSourceSelectionsArray: fragmentStyleSourceSelections,
    styleSourcesMap: fragmentStyleSources,
    stylesArray: fragmentStyles,
  } = collectStyleSourcesFromInstances({
    instanceIds: fragmentInstanceIds,
    styleSourceSelections,
    styleSources,
    styles,
  });

  for (const instanceId of fragmentInstanceIds) {
    const instance = instances.get(instanceId);
    if (instance) {
      fragmentInstances.push(instance);
    }
  }

  const fragmentAssetIds = new Set<Asset["id"]>();
  const fragmentFontFamilies = new Set<string>();

  // collect breakpoints and assets from styles
  const fragmentBreakpoints: Breakpoints = new Map();
  for (const styleDecl of fragmentStyles) {
    // collect breakpoints
    if (fragmentBreakpoints.has(styleDecl.breakpointId) === false) {
      const breakpoint = breakpoints.get(styleDecl.breakpointId);
      if (breakpoint) {
        fragmentBreakpoints.set(styleDecl.breakpointId, breakpoint);
      }
    }

    // collect assets
    traverseStyleValue(styleDecl.value, (value) => {
      if (value.type === "image") {
        if (value.value.type === "asset") {
          fragmentAssetIds.add(value.value.value);
        }
      }
    });
    for (const fontFamily of collectFontFamiliesFromStyleValue(
      styleDecl.value
    )) {
      fragmentFontFamilies.add(fontFamily);
    }
  }

  // collect variables scoped to fragment instances
  // and variables outside of scope to unset
  const fragmentDataSources: DataSources = new Map();
  const fragmentResourceIds = new Set<Resource["id"]>();
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  const unsetVariables = options.unsetVariables ?? new Set();
  for (const dataSource of dataSources.values()) {
    if (
      fragmentInstanceIds.has(dataSource.scopeInstanceId ?? "") &&
      unsetVariables.has(dataSource.id) === false
    ) {
      fragmentDataSources.set(dataSource.id, dataSource);
      if (dataSource.type === "resource") {
        fragmentResourceIds.add(dataSource.resourceId);
      }
    } else {
      unsetNameById.set(dataSource.id, dataSource.name);
    }
  }

  // unset variables outside of scope
  fragmentInstances = fragmentInstances.map((instance) => {
    instance = structuredClone(unwrap(instance));
    for (const child of instance.children) {
      if (child.type === "expression") {
        const expression = child.value;
        child.value = unsetExpressionVariables({ expression, unsetNameById });
      }
    }
    return instance;
  });

  // collect props bound to these instances
  // and unset variables outside of scope
  const fragmentProps: Prop[] = [];
  for (const prop of props.values()) {
    if (fragmentInstanceIds.has(prop.instanceId) === false) {
      continue;
    }

    if (prop.type === "expression") {
      const newProp = structuredClone(unwrap(prop));
      const expression = prop.value;
      newProp.value = unsetExpressionVariables({ expression, unsetNameById });
      fragmentProps.push(newProp);
      continue;
    }

    if (prop.type === "action") {
      const newProp = structuredClone(unwrap(prop));
      for (const value of newProp.value) {
        const expression = value.code;
        value.code = unsetExpressionVariables({ expression, unsetNameById });
      }
      fragmentProps.push(newProp);
      continue;
    }

    fragmentProps.push(prop);

    // collect assets
    if (prop.type === "asset") {
      fragmentAssetIds.add(prop.value);
    }

    // collect resources from props
    if (prop.type === "resource") {
      fragmentResourceIds.add(prop.value);
    }
  }

  // collect resources bound to all fragment data sources
  // and unset variables which are defined outside of scope
  // and used in resource
  const fragmentResources: Resource[] = [];
  for (const resourceId of fragmentResourceIds) {
    const resource = resources.get(resourceId);
    if (resource === undefined) {
      continue;
    }
    const newResource = structuredClone(unwrap(resource));
    newResource.url = unsetExpressionVariables({
      expression: newResource.url,
      unsetNameById,
    });
    for (const header of newResource.headers) {
      header.value = unsetExpressionVariables({
        expression: header.value,
        unsetNameById,
      });
    }
    if (newResource.searchParams) {
      for (const searchParam of newResource.searchParams) {
        searchParam.value = unsetExpressionVariables({
          expression: searchParam.value,
          unsetNameById,
        });
      }
    }
    if (newResource.body) {
      newResource.body = unsetExpressionVariables({
        expression: newResource.body,
        unsetNameById,
      });
    }
    fragmentResources.push(newResource);
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
    breakpoints: Array.from(fragmentBreakpoints.values()),
    styles: fragmentStyles,
    dataSources: Array.from(fragmentDataSources.values()),
    resources: fragmentResources,
    props: fragmentProps,
    assets: fragmentAssets,
  };
};

const getFragmentInstancesData = (fragment: WebstudioFragment) => {
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
  return { fragmentInstances, portalContentRootIds };
};

const insertFragmentAssetsMutable = ({
  fragment,
  projectId,
  assets,
}: {
  fragment: WebstudioFragment;
  projectId: string;
  assets: WebstudioData["assets"];
}) => {
  for (const asset of fragment.assets) {
    // asset can be already present if pasting to the same project
    if (assets.has(asset.id) === false) {
      // we use the same asset.id so the references are preserved
      assets.set(asset.id, { ...asset, projectId });
    }
  }
};

const insertFragmentBreakpointsMutable = ({
  fragment,
  breakpoints,
  onBreakpointLimitMerge,
}: {
  fragment: WebstudioFragment;
  breakpoints: Breakpoints;
  onBreakpointLimitMerge?: () => void;
}) => {
  let didMergeBreakpointsDueToLimit = false;
  const mergedBreakpointIds = buildMergedBreakpointIds(
    fragment.breakpoints,
    breakpoints,
    {
      maxBreakpointCount: maxBreakpoints,
      onBreakpointMergedDueToLimit: () => {
        didMergeBreakpointsDueToLimit = true;
      },
    }
  );
  if (didMergeBreakpointsDueToLimit) {
    onBreakpointLimitMerge?.();
  }
  for (const newBreakpoint of fragment.breakpoints) {
    if (mergedBreakpointIds.has(newBreakpoint.id) === false) {
      breakpoints.set(newBreakpoint.id, newBreakpoint);
    }
  }
  return { mergedBreakpointIds, didMergeBreakpointsDueToLimit };
};

export const fragmentTesting = {
  getFragmentInstancesData,
  insertFragmentAssetsMutable,
  insertFragmentBreakpointsMutable,
};

export const insertWebstudioFragmentCopy = ({
  data,
  fragment,
  availableVariables,
  projectId,
  conflictResolution = "theirs",
  onBreakpointLimitMerge,
  metas,
  contentModeCopyableProp,
  createId = nanoid,
  // In content mode, insertion keeps content-editable instance data, creates
  // local styles for inserted instances, and avoids data/resource records.
  contentMode = false,
}: {
  data: Omit<WebstudioData, "pages">;
  fragment: WebstudioFragment;
  availableVariables: DataSource[];
  projectId: string;
  conflictResolution?: ConflictResolution;
  onBreakpointLimitMerge?: () => void;
  metas?: Map<string, WsComponentMeta>;
  contentModeCopyableProp?: ContentModeCopyableProp;
  createId?: () => string;
  contentMode?: boolean;
}) => {
  const newInstanceIds = new Map<Instance["id"], Instance["id"]>();
  const newDataSourceIds = new Map<DataSource["id"], DataSource["id"]>();
  const newDataIds = {
    newInstanceIds,
    newDataSourceIds,
  };

  const { fragmentInstances, portalContentRootIds } =
    getFragmentInstancesData(fragment);

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

  const { mergedBreakpointIds, didMergeBreakpointsDueToLimit } =
    contentMode === false
      ? insertFragmentBreakpointsMutable({
          fragment,
          breakpoints,
          onBreakpointLimitMerge,
        })
      : {
          mergedBreakpointIds: new Map<
            StyleDecl["breakpointId"],
            StyleDecl["breakpointId"]
          >(),
          didMergeBreakpointsDueToLimit: false,
        };

  insertFragmentAssetsMutable({ fragment, projectId, assets });

  let styleSourceIdMap = new Map<
    StyleDecl["styleSourceId"],
    StyleDecl["styleSourceId"]
  >();

  if (contentMode === false) {
    // insert tokens with their styles

    styleSourceIdMap = insertTokenStyleSources({
      fragmentStyleSources: fragment.styleSources,
      fragmentStyles: fragment.styles,
      styleSources,
      styles,
      breakpoints,
      mergedBreakpointIds,
      conflictResolution,
      createId,
    });
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

    if (contentMode === false) {
      const usedResourceIds = new Set<Resource["id"]>();
      for (const dataSource of fragment.dataSources) {
        // insert only data sources within portal content
        if (instanceIds.has(dataSource.scopeInstanceId ?? "")) {
          dataSources.set(dataSource.id, dataSource);
          if (dataSource.type === "resource") {
            usedResourceIds.add(dataSource.resourceId);
          }
        }
      }

      for (const prop of fragment.props) {
        if (instanceIds.has(prop.instanceId)) {
          props.set(prop.id, prop);
          if (prop.type === "resource") {
            usedResourceIds.add(prop.value);
          }
        }
      }

      for (const resource of fragment.resources) {
        if (usedResourceIds.has(resource.id)) {
          resources.set(resource.id, resource);
        }
      }
    }

    for (const instance of fragment.instances) {
      if (instanceIds.has(instance.id)) {
        instances.set(instance.id, instance);
      }
    }

    if (contentMode === false) {
      // insert local style sources with their styles

      insertPortalLocalStyleSources({
        fragmentStyleSources: fragment.styleSources,
        fragmentStyleSourceSelections: fragment.styleSourceSelections,
        fragmentStyles: fragment.styles,
        instanceIds,
        styleSources,
        styleSourceSelections,
        styles,
        mergedBreakpointIds,
      });
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
    newInstanceIds.set(instanceId, createId());
  }
  fragmentInstanceIds.add(ROOT_INSTANCE_ID);
  newInstanceIds.set(ROOT_INSTANCE_ID, ROOT_INSTANCE_ID);

  const maskedIdByName = new Map<DataSource["name"], DataSource["id"]>();
  for (const dataSource of availableVariables) {
    maskedIdByName.set(dataSource.name, dataSource.id);
  }
  const newResourceIds = new Map<Resource["id"], Resource["id"]>();
  if (contentMode === false) {
    for (let dataSource of fragment.dataSources) {
      const scopeInstanceId = dataSource.scopeInstanceId ?? "";
      if (scopeInstanceId === ROOT_INSTANCE_ID) {
        // add global variable only if not exist already
        if (
          dataSources.has(dataSource.id) === false &&
          maskedIdByName.has(dataSource.name) === false
        ) {
          dataSources.set(dataSource.id, dataSource);
        }
        continue;
      }
      // insert only data sources within portal content
      if (fragmentInstanceIds.has(scopeInstanceId)) {
        const newDataSourceId = createId();
        newDataSourceIds.set(dataSource.id, newDataSourceId);
        dataSource = structuredClone(unwrap(dataSource));
        dataSource.id = newDataSourceId;
        dataSource.scopeInstanceId =
          newInstanceIds.get(scopeInstanceId) ?? scopeInstanceId;
        if (dataSource.type === "resource") {
          const newResourceId = createId();
          newResourceIds.set(dataSource.resourceId, newResourceId);
          dataSource.resourceId = newResourceId;
        }
        dataSources.set(dataSource.id, dataSource);
      }
    }
  }

  for (let prop of fragment.props) {
    if (fragmentInstanceIds.has(prop.instanceId) === false) {
      continue;
    }
    if (
      contentMode &&
      contentModeCopyableProp !== undefined &&
      contentModeCopyableProp({
        prop,
        fragment,
        fragmentInstances,
        styleSources,
        metas: metas ?? new Map(),
      }) === false
    ) {
      continue;
    }
    prop = clonePropForInstance({
      prop: unwrap(prop),
      propId: createId(),
      instanceId: newInstanceIds.get(prop.instanceId) ?? prop.instanceId,
    });
    if (prop.type === "expression") {
      prop.value = restoreExpressionVariables({
        expression: prop.value,
        maskedIdByName,
      });
      prop.value = replaceDataSourcesInExpression(prop.value, newDataSourceIds);
    }
    if (prop.type === "action") {
      for (const value of prop.value) {
        value.code = restoreExpressionVariables({
          expression: value.code,
          maskedIdByName,
        });
        value.code = replaceDataSourcesInExpression(
          value.code,
          newDataSourceIds
        );
      }
    }
    if (prop.type === "parameter") {
      prop.value = newDataSourceIds.get(prop.value) ?? prop.value;
    }
    if (prop.type === "resource") {
      const newResourceId = createId();
      newResourceIds.set(prop.value, newResourceId);
      prop.value = newResourceId;
    }
    props.set(prop.id, prop);
  }

  if (contentMode === false) {
    for (let resource of fragment.resources) {
      if (newResourceIds.has(resource.id) === false) {
        continue;
      }
      resource = structuredClone(unwrap(resource));
      resource.id = newResourceIds.get(resource.id) ?? resource.id;
      resource.url = restoreExpressionVariables({
        expression: resource.url,
        maskedIdByName,
      });
      resource.url = replaceDataSourcesInExpression(
        resource.url,
        newDataSourceIds
      );
      for (const header of resource.headers) {
        header.value = restoreExpressionVariables({
          expression: header.value,
          maskedIdByName,
        });
        header.value = replaceDataSourcesInExpression(
          header.value,
          newDataSourceIds
        );
      }
      if (resource.searchParams) {
        for (const searchParam of resource.searchParams) {
          searchParam.value = restoreExpressionVariables({
            expression: searchParam.value,
            maskedIdByName,
          });
          searchParam.value = replaceDataSourcesInExpression(
            searchParam.value,
            newDataSourceIds
          );
        }
      }
      if (resource.body) {
        resource.body = restoreExpressionVariables({
          expression: resource.body,
          maskedIdByName,
        });
        resource.body = replaceDataSourcesInExpression(
          resource.body,
          newDataSourceIds
        );
      }
      resources.set(resource.id, resource);
    }
  }

  for (let instance of fragment.instances) {
    if (fragmentInstanceIds.has(instance.id)) {
      instance = cloneInstanceWithNewIds({
        instance: unwrap(instance),
        newInstanceIds,
      });
      for (const child of instance.children) {
        if (child.type === "expression") {
          child.value = restoreExpressionVariables({
            expression: child.value,
            maskedIdByName,
          });
          child.value = replaceDataSourcesInExpression(
            child.value,
            newDataSourceIds
          );
        }
      }
      instances.set(instance.id, instance);
    }
  }

  const localStyleSourceInput = {
    fragmentStyleSources: fragment.styleSources,
    fragmentStyleSourceSelections: fragment.styleSourceSelections,
    fragmentStyles: fragment.styles,
    fragmentInstanceIds,
    newInstanceIds,
    styleSources,
    styleSourceSelections,
    styles,
  };
  if (contentMode) {
    insertLocalStyleSourcesWithNewIds({
      ...localStyleSourceInput,
      contentMode: true,
      breakpoints,
      createId,
    });
  } else {
    insertLocalStyleSourcesWithNewIds({
      ...localStyleSourceInput,
      contentMode: false,
      styleSourceIdMap,
      mergedBreakpointIds,
      breakpoints,
      createId,
    });
  }

  return { ...newDataIds, didMergeBreakpointsDueToLimit };
};

export const copyWebstudioFragmentMutable = ({
  data,
  fragment,
  targetInstanceId,
  projectId,
  conflictResolution,
  onBreakpointLimitMerge,
  createId,
}: {
  data: Omit<WebstudioData, "pages">;
  fragment: WebstudioFragment;
  targetInstanceId: Instance["id"];
  projectId: string;
  conflictResolution?: ConflictResolution;
  onBreakpointLimitMerge?: () => void;
  createId?: () => string;
}) =>
  insertWebstudioFragmentCopy({
    data,
    fragment,
    availableVariables: findAvailableVariables({
      ...data,
      startingInstanceId: targetInstanceId,
    }),
    projectId,
    conflictResolution,
    onBreakpointLimitMerge,
    createId,
  });

export const mapFragmentChildrenToCopiedChildren = ({
  children,
  newInstanceIds,
}: {
  children: Instance["children"];
  newInstanceIds: Map<Instance["id"], Instance["id"]>;
}): Instance["children"] =>
  children.reduce<Instance["children"]>((mappedChildren, child) => {
    if (child.type !== "id") {
      mappedChildren.push(child);
      return mappedChildren;
    }
    mappedChildren.push({
      type: "id",
      value: newInstanceIds.get(child.value) ?? child.value,
    });
    return mappedChildren;
  }, []);
export const detectFragmentTokenConflicts = ({
  fragment,
  targetData,
}: {
  fragment: WebstudioFragment;
  targetData: WebstudioData;
}) => {
  const mergedBreakpointIds = buildMergedBreakpointIds(
    fragment.breakpoints,
    targetData.breakpoints,
    { maxBreakpointCount: maxBreakpoints }
  );

  return detectTokenConflicts({
    fragmentStyleSources: fragment.styleSources,
    fragmentStyles: fragment.styles,
    existingStyleSources: targetData.styleSources,
    existingStyles: targetData.styles,
    breakpoints: targetData.breakpoints,
    mergedBreakpointIds,
  });
};

/**
 * Detects token conflicts for a page insertion.
 * Combines fragments from ROOT_INSTANCE and page body for conflict detection.
 *
 * @param sourceData - The source webstudio data containing the page
 * @param pageId - The page ID to check for conflicts
 * @returns Array of token conflicts (empty if no conflicts)
 */
export const detectPageTokenConflicts = ({
  sourceData,
  targetData,
  pageId,
}: {
  sourceData: WebstudioData;
  targetData: WebstudioData;
  pageId: string;
}) => {
  const page = findPageByIdOrPath(pageId, sourceData.pages);
  if (page === undefined) {
    throw new Error("Page not found");
  }
  const targetPage = page ?? getHomePage(sourceData.pages);

  // Extract fragments for both ROOT_INSTANCE and page body
  const rootFragment = extractWebstudioFragment(sourceData, ROOT_INSTANCE_ID);
  const pageFragment = extractWebstudioFragment(
    sourceData,
    targetPage.rootInstanceId
  );

  // Combine style sources and styles from both fragments
  const combinedStyleSources = [
    ...rootFragment.styleSources,
    ...pageFragment.styleSources,
  ];
  const combinedStyles = [...rootFragment.styles, ...pageFragment.styles];
  const combinedBreakpoints = [
    ...rootFragment.breakpoints,
    ...pageFragment.breakpoints,
  ];

  const mergedBreakpointIds = buildMergedBreakpointIds(
    combinedBreakpoints,
    targetData.breakpoints,
    { maxBreakpointCount: maxBreakpoints }
  );

  return detectTokenConflicts({
    fragmentStyleSources: combinedStyleSources,
    fragmentStyles: combinedStyles,
    existingStyleSources: targetData.styleSources,
    existingStyles: targetData.styles,
    breakpoints: targetData.breakpoints,
    mergedBreakpointIds,
  });
};
