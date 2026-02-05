import { current, isDraft } from "immer";
import { nanoid } from "nanoid";
import { toast } from "@webstudio-is/design-system";
import { builderApi } from "~/shared/builder-api";
import type { StyleValue } from "@webstudio-is/css-engine";
import { showAttribute } from "@webstudio-is/react-sdk";
import {
  type Instances,
  type Instance,
  type StyleDecl,
  type Asset,
  type Breakpoints,
  type DataSources,
  type DataSource,
  type WebstudioFragment,
  type WebstudioData,
  type Resource,
  type WsComponentMeta,
  type Pages,
  getStyleDeclKey,
  findTreeInstanceIds,
  findTreeInstanceIdsExcludingSlotDescendants,
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  transpileExpression,
  ROOT_INSTANCE_ID,
  portalComponent,
  collectionComponent,
  Prop,
  Props,
  elementComponent,
  tags,
  blockTemplateComponent,
  isComponentDetachable,
} from "@webstudio-is/sdk";
import { detectTokenConflicts } from "./style-source-utils";
import { type ConflictResolution } from "./token-conflict-dialog";
import { buildMergedBreakpointIds } from "./breakpoints-utils";
import {
  $props,
  $styles,
  $styleSourceSelections,
  $styleSources,
  $instances,
  $registeredComponentMetas,
  $dataSources,
  $assets,
  $breakpoints,
  $pages,
  $resources,
  $registeredTemplates,
  $project,
  $isPreviewMode,
  $textEditingInstanceSelector,
  $isContentMode,
  findBlockSelector,
} from "./nano-states";
import {
  type DroppableTarget,
  type InstanceSelector,
  findLocalStyleSourcesWithinInstances,
  getReparentDropTargetMutable,
  getInstanceOrCreateFragmentIfNecessary,
  wrapEditableChildrenAroundDropTargetMutable,
} from "./tree-utils";
import {
  insertStyleSources,
  insertPortalLocalStyleSources,
  insertLocalStyleSourcesWithNewIds,
  deleteLocalStyleSourcesMutable,
  collectStyleSourcesFromInstances,
} from "./style-source-utils";
import { removeByMutable } from "./array-utils";
import { serverSyncStore } from "./sync/sync-stores";
import { setDifference, setUnion } from "./shim";
import { breakCyclesMutable, findCycles } from "@webstudio-is/project-build";
import {
  $awareness,
  $selectedInstancePath,
  $selectedPage,
  findAwarenessByInstanceId,
  getInstancePath,
  selectInstance,
  type InstancePath,
} from "./awareness";
import { findClosestInstanceMatchingFragment } from "./matcher";
import {
  findAvailableVariables,
  restoreExpressionVariables,
  unsetExpressionVariables,
} from "./data-variables";
import {
  findClosestNonTextualContainer,
  isRichTextTree,
  isTreeSatisfyingContentModel,
  isRichTextContent,
} from "./content-model";
import type { Project } from "@webstudio-is/project";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $instanceTags } from "~/builder/features/style-panel/shared/model";
import { reactPropsToStandardAttributes } from "@webstudio-is/react-sdk";

/**
 * structuredClone can be invoked on draft and throw error
 * extract current snapshot before cloning
 */
export const unwrap = <Value>(value: Value) =>
  isDraft(value) ? current(value) : value;

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

export const findAllEditableInstanceSelector = ({
  instanceSelector,
  instances,
  props,
  metas,
  results,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  results: InstanceSelector[];
}) => {
  const [instanceId] = instanceSelector;

  if (instanceId === undefined) {
    return;
  }

  // Check if current instance is text editing instance
  if (isRichTextTree({ instanceId, instances, props, metas })) {
    results.push(instanceSelector);
    return;
  }

  const instance = instances.get(instanceId);
  if (instance) {
    for (const child of instance.children) {
      if (child.type === "id") {
        findAllEditableInstanceSelector({
          instanceSelector: [child.value, ...instanceSelector],
          instances,
          props,
          metas,
          results,
        });
      }
    }
  }
};

export const insertInstanceChildrenMutable = (
  data: Omit<WebstudioData, "pages">,
  children: Instance["children"],
  insertTarget: Insertable
) => {
  const dropTarget: DroppableTarget = {
    parentSelector: insertTarget.parentSelector,
    position: insertTarget.position === "after" ? "end" : insertTarget.position,
  };
  const metas = $registeredComponentMetas.get();
  insertTarget =
    getInstanceOrCreateFragmentIfNecessary(data.instances, dropTarget) ??
    insertTarget;
  insertTarget =
    wrapEditableChildrenAroundDropTargetMutable(
      data.instances,
      data.props,
      metas,
      dropTarget
    ) ?? insertTarget;
  const [parentInstanceId] = insertTarget.parentSelector;
  const parentInstance = data.instances.get(parentInstanceId);
  if (parentInstance === undefined) {
    return;
  }
  if (dropTarget.position === "end") {
    parentInstance.children.push(...children);
  } else {
    parentInstance.children.splice(dropTarget.position, 0, ...children);
  }
};

export const insertWebstudioElementAt = (insertable?: Insertable) => {
  const instances = $instances.get();
  const props = $props.get();
  const metas = $registeredComponentMetas.get();
  // find closest container and try to match new element with it
  if (insertable === undefined) {
    const instancePath = $selectedInstancePath.get();
    if (instancePath === undefined) {
      return false;
    }
    const [{ instanceSelector }] = instancePath;
    const containerSelector = findClosestNonTextualContainer({
      instances,
      props,
      metas,
      instanceSelector,
    });
    const insertableIndex = instanceSelector.length - containerSelector.length;
    if (insertableIndex === 0) {
      insertable = {
        parentSelector: containerSelector,
        position: "end",
      };
    } else {
      const containerInstance = instances.get(containerSelector[0]);
      if (containerInstance === undefined) {
        return false;
      }
      const lastChildInstanceId = instanceSelector[insertableIndex - 1];
      const lastChildPosition = containerInstance.children.findIndex(
        (child) => child.type === "id" && child.value === lastChildInstanceId
      );
      insertable = {
        parentSelector: containerSelector,
        position: lastChildPosition + 1,
      };
    }
  }
  // create element and find matching tag
  const element: Instance = {
    type: "instance",
    id: nanoid(),
    component: elementComponent,
    children: [],
  };
  const newInstances = new Map(instances);
  newInstances.set(element.id, element);
  let matchingTag: undefined | string;
  for (const tag of tags) {
    element.tag = tag;
    const isSatisfying = isTreeSatisfyingContentModel({
      instances: newInstances,
      props,
      metas,
      instanceSelector: [element.id, ...insertable.parentSelector],
    });
    if (isSatisfying) {
      matchingTag = tag;
      break;
    }
  }
  if (matchingTag === undefined) {
    return false;
  }
  // insert element
  updateWebstudioData((data) => {
    data.instances.set(element.id, element);
    const children: Instance["children"] = [{ type: "id", value: element.id }];
    insertInstanceChildrenMutable(data, children, insertable);
  });
  selectInstance([element.id, ...insertable.parentSelector]);
  return true;
};

export const insertWebstudioFragmentAt = (
  fragment: WebstudioFragment,
  insertable?: Insertable,
  conflictResolution?: ConflictResolution
): boolean => {
  // cannot insert empty fragment
  if (fragment.children.length === 0) {
    return false;
  }
  const project = $project.get();
  insertable = findClosestInsertable(fragment, insertable) ?? insertable;
  if (project === undefined || insertable === undefined) {
    return false;
  }
  let newInstanceSelector: undefined | InstanceSelector;
  updateWebstudioData((data) => {
    const instancePath = getInstancePath(
      insertable.parentSelector,
      data.instances
    );
    if (instancePath === undefined) {
      return;
    }
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: findAvailableVariables({
        ...data,
        startingInstanceId: instancePath[0].instance.id,
      }),
      projectId: project.id,
      conflictResolution,
    });
    const children: Instance["children"] = fragment.children.map((child) => {
      if (child.type === "id") {
        return {
          type: "id",
          value: newInstanceIds.get(child.value) ?? child.value,
        };
      }
      return child;
    });
    let parentSelector;
    let position: number | "end";
    if (insertable.position === "after") {
      if (instancePath.length === 1) {
        parentSelector = insertable.parentSelector;
        position = "end";
      } else {
        parentSelector = instancePath[1].instanceSelector;
        const [{ instance }, { instance: parentInstance }] = instancePath;
        const index = parentInstance.children.findIndex(
          (child) => child.type === "id" && child.value === instance.id
        );
        position = 1 + index;
      }
    } else {
      parentSelector = insertable.parentSelector;
      position = insertable.position;
    }
    insertInstanceChildrenMutable(data, children, {
      parentSelector,
      position,
    });
    newInstanceSelector = [children[0].value, ...parentSelector];
  });
  if (newInstanceSelector) {
    selectInstance(newInstanceSelector);
  }
  return true;
};

export const getComponentTemplateData = (
  componentOrTemplate: string
): WebstudioFragment => {
  const templates = $registeredTemplates.get();
  const templateMeta = templates.get(componentOrTemplate);
  if (templateMeta) {
    return templateMeta.template;
  }
  const newInstance: Instance = {
    id: nanoid(),
    type: "instance",
    component: componentOrTemplate,
    children: [],
  };
  return {
    children: [{ type: "id", value: newInstance.id }],
    instances: [newInstance],
    props: [],
    dataSources: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
    breakpoints: [],
    assets: [],
    resources: [],
  };
};

export const reparentInstanceMutable = (
  data: Omit<WebstudioData, "pages">,
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  const project = $project.get();
  if (project === undefined) {
    return;
  }
  const [rootInstanceId] = sourceInstanceSelector;
  // delect is target is one of own descendants
  // prevent reparenting to avoid infinite loop
  const instanceDescendants = findTreeInstanceIds(
    data.instances,
    rootInstanceId
  );
  for (const instanceId of instanceDescendants) {
    if (dropTarget.parentSelector.includes(instanceId)) {
      return;
    }
  }
  // try to use slot fragment as target instead of slot itself
  const parentInstance = data.instances.get(dropTarget.parentSelector[0]);
  if (
    parentInstance?.component === portalComponent &&
    parentInstance.children.length > 0 &&
    parentInstance.children[0].type === "id"
  ) {
    const fragmentId = parentInstance.children[0].value;
    dropTarget = {
      parentSelector: [fragmentId, ...dropTarget.parentSelector],
      position: dropTarget.position,
    };
  }
  // move within same parent
  if (sourceInstanceSelector[1] === dropTarget.parentSelector[0]) {
    const [parentId] = dropTarget.parentSelector;
    const parent = data.instances.get(parentId);
    if (parent === undefined) {
      return;
    }
    const prevPosition = parent.children.findIndex(
      (child) => child.type === "id" && child.value === rootInstanceId
    );
    const child = parent.children[prevPosition];
    parent?.children.splice(prevPosition, 1);
    if (dropTarget.position === "end") {
      parent?.children.push(child);
    } else {
      // when parent is the same, we need to adjust the position
      // to account for the removal of the instance.
      let nextPosition = dropTarget.position;
      if (prevPosition < nextPosition) {
        nextPosition -= 1;
      }
      parent?.children.splice(nextPosition, 0, child);
    }
    return sourceInstanceSelector;
  }
  // move into another parent
  const fragment = extractWebstudioFragment(data, rootInstanceId);
  deleteInstanceMutable(
    data,
    getInstancePath(sourceInstanceSelector, data.instances)
  );
  // prepare drop target after deleting instance to recreate new slot fragment
  dropTarget =
    getReparentDropTargetMutable(
      data.instances,
      data.props,
      $registeredComponentMetas.get(),
      dropTarget
    ) ?? dropTarget;
  const { newInstanceIds } = insertWebstudioFragmentCopy({
    data,
    fragment,
    availableVariables: findAvailableVariables({
      ...data,
      startingInstanceId: dropTarget.parentSelector[0],
    }),
    projectId: project.id,
  });
  const [newParentId] = dropTarget.parentSelector;
  const newRootInstanceId =
    newInstanceIds.get(rootInstanceId) ?? rootInstanceId;
  const newParent = data.instances.get(newParentId);
  const newChild = { type: "id" as const, value: newRootInstanceId };
  if (dropTarget.position === "end") {
    newParent?.children.push(newChild);
  } else {
    newParent?.children.splice(dropTarget.position, 0, newChild);
  }
  return [newRootInstanceId, ...dropTarget.parentSelector];
};

export const reparentInstance = (
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  updateWebstudioData((data) => {
    const newSelector = reparentInstanceMutable(
      data,
      sourceInstanceSelector,
      dropTarget
    );
    selectInstance(newSelector);
  });
};

export const deleteInstanceMutable = (
  data: Omit<WebstudioData, "pages">,
  instancePath: undefined | InstancePath
) => {
  if (instancePath === undefined) {
    return false;
  }
  const {
    instances,
    props,
    styleSourceSelections,
    styleSources,
    styles,
    dataSources,
    resources,
  } = data;
  let targetInstance = instancePath[0].instance;
  let parentInstance =
    instancePath.length > 1 ? instancePath[1]?.instance : undefined;
  const grandparentInstance =
    instancePath.length > 2 ? instancePath[2]?.instance : undefined;

  // delete parent fragment too if its last child is going to be deleted
  // use case for slots: slot became empty and remove display: contents
  // to be displayed properly on canvas
  if (
    parentInstance?.component === "Fragment" &&
    parentInstance.children.length === 1 &&
    grandparentInstance
  ) {
    targetInstance = parentInstance;
    parentInstance = grandparentInstance;
  }

  const instanceIds = findTreeInstanceIdsExcludingSlotDescendants(
    instances,
    targetInstance.id
  );
  const localStyleSourceIds = findLocalStyleSourcesWithinInstances(
    styleSources.values(),
    styleSourceSelections.values(),
    instanceIds
  );

  // mutate instances from data instead of instance path
  parentInstance = data.instances.get(parentInstance?.id as string);
  // may not exist when delete root
  if (parentInstance) {
    removeByMutable(
      parentInstance.children,
      (child) => child.type === "id" && child.value === targetInstance.id
    );
  }

  for (const instanceId of instanceIds) {
    instances.delete(instanceId);
  }
  // delete props, data sources and styles of deleted instance and its descendants
  for (const prop of props.values()) {
    if (instanceIds.has(prop.instanceId)) {
      props.delete(prop.id);
      if (prop.type === "resource") {
        resources.delete(prop.value);
      }
    }
  }
  for (const dataSource of dataSources.values()) {
    if (instanceIds.has(dataSource.scopeInstanceId ?? "")) {
      dataSources.delete(dataSource.id);
      if (dataSource.type === "resource") {
        resources.delete(dataSource.resourceId);
      }
    }
  }
  for (const instanceId of instanceIds) {
    styleSourceSelections.delete(instanceId);
  }
  deleteLocalStyleSourcesMutable({
    localStyleSourceIds,
    styleSources,
    styles,
  });
  return true;
};

export const unwrapInstanceMutable = ({
  instances,
  props,
  metas,
  selectedItem,
  parentItem,
}: {
  instances: Map<string, Instance>;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  selectedItem: {
    instanceSelector: InstanceSelector;
    instance: { id: string };
  };
  parentItem: { instanceSelector: InstanceSelector; instance: { id: string } };
}): { success: boolean; error?: string } => {
  // Check if the selected instance is rich text content (like Bold, Italic in Paragraph)
  if (
    isRichTextContent({
      instanceSelector: selectedItem.instanceSelector,
      instances,
      props,
      metas,
    })
  ) {
    return { success: false, error: "Cannot unwrap textual instance" };
  }

  const parentInstance = instances.get(parentItem.instance.id);
  const selectedInstance = instances.get(selectedItem.instance.id);
  if (!parentInstance || !selectedInstance) {
    return { success: false, error: "Instance not found" };
  }

  // Get grandparent to replace parent with selected
  const grandparentId = parentItem.instanceSelector[1];
  if (!grandparentId) {
    return { success: false, error: "Cannot unwrap instance at root level" };
  }
  const grandparentInstance = instances.get(grandparentId);
  if (!grandparentInstance) {
    return { success: false, error: "Grandparent instance not found" };
  }

  // Remove selected instance from parent's children
  const selectedIndexInParent = parentInstance.children.findIndex(
    (child) => child.type === "id" && child.value === selectedItem.instance.id
  );
  if (selectedIndexInParent !== -1) {
    parentInstance.children.splice(selectedIndexInParent, 1);
  }

  // If parent has no more children, delete it
  if (parentInstance.children.length === 0) {
    instances.delete(parentItem.instance.id);
  }

  // Add selected instance to grandparent at parent's position
  const parentIndex = grandparentInstance.children.findIndex(
    (child) => child.type === "id" && child.value === parentItem.instance.id
  );
  if (parentIndex !== -1) {
    if (parentInstance.children.length === 0) {
      // Replace parent with selected if parent is now empty
      grandparentInstance.children[parentIndex] = {
        type: "id",
        value: selectedItem.instance.id,
      };
    } else {
      // Insert selected after parent if parent still has children
      grandparentInstance.children.splice(parentIndex + 1, 0, {
        type: "id",
        value: selectedItem.instance.id,
      });
    }
  }

  const matches = isTreeSatisfyingContentModel({
    instances,
    props,
    metas,
    instanceSelector: [
      selectedItem.instance.id,
      ...parentItem.instanceSelector.slice(1),
    ],
  });
  if (matches === false) {
    return { success: false, error: "Cannot unwrap instance" };
  }

  return { success: true };
};

export const canUnwrapInstance = (instancePath: InstancePath) => {
  // Need at least 3 levels: selected, parent, and grandparent
  // Can't unwrap if there's no grandparent to move the selected instance to
  if (instancePath.length < 3) {
    return false;
  }
  const [selectedItem, parentItem] = instancePath;

  // Prevent unwrapping if parent is the root instance (e.g., Body)
  const rootInstanceId = $selectedPage.get()?.rootInstanceId;
  if (
    rootInstanceId !== undefined &&
    parentItem.instance.id === rootInstanceId
  ) {
    return false;
  }

  // Check if the selected instance is rich text content (like Bold, Italic in Paragraph)
  const instances = $instances.get();
  const props = $props.get();
  const metas = $registeredComponentMetas.get();

  if (
    isRichTextContent({
      instanceSelector: selectedItem.instanceSelector,
      instances,
      props,
      metas,
    })
  ) {
    return false;
  }

  return true;
};

export const toggleInstanceShow = (instanceId: Instance["id"]) => {
  serverSyncStore.createTransaction([$props], (props) => {
    const allProps = Array.from(props.values());
    const instanceProps = allProps.filter(
      (prop) => prop.instanceId === instanceId
    );
    let showProp = instanceProps.find((prop) => prop.name === showAttribute);

    // Toggle the show value
    const newValue = showProp?.type === "boolean" ? !showProp.value : false;

    if (showProp === undefined) {
      showProp = {
        id: nanoid(),
        instanceId,
        name: showAttribute,
        type: "boolean",
        value: newValue,
      };
    }
    if (showProp.type === "boolean") {
      props.set(showProp.id, { ...showProp, value: newValue });
    }
  });
};

export const wrapInstance = (component: string, tag?: string) => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem, parentItem] = instancePath;
  const selectedInstance = selectedItem.instance;
  const newInstanceId = nanoid();
  const newInstanceSelector = [newInstanceId, ...parentItem.instanceSelector];
  const metas = $registeredComponentMetas.get();

  try {
    updateWebstudioData((data) => {
      const isContent = isRichTextContent({
        instanceSelector: selectedItem.instanceSelector,
        instances: data.instances,
        props: data.props,
        metas,
      });
      if (isContent) {
        toast.error(`Cannot wrap textual content`);
        throw Error("Abort transaction");
      }
      const newInstance: Instance = {
        type: "instance",
        id: newInstanceId,
        component,
        children: [{ type: "id", value: selectedInstance.id }],
      };

      if (tag || component === elementComponent) {
        newInstance.tag = tag ?? "div";
      }
      const parentInstance = data.instances.get(parentItem.instance.id);
      data.instances.set(newInstanceId, newInstance);
      if (parentInstance) {
        for (const child of parentInstance.children) {
          if (child.type === "id" && child.value === selectedInstance.id) {
            child.value = newInstanceId;
          }
        }
      }

      const isSatisfying = isTreeSatisfyingContentModel({
        instances: data.instances,
        props: data.props,
        metas,
        instanceSelector: newInstanceSelector,
      });

      if (isSatisfying === false) {
        const label = getInstanceLabel({ component, tag });
        toast.error(`Cannot wrap in ${label}`);
        throw Error("Abort transaction");
      }
    });
    selectInstance(newInstanceSelector);
  } catch {
    // do nothing
  }
};

// Check if an instance can be converted to a specific component or tag
export const canConvertInstance = (
  selectedInstanceId: string,
  selectedInstanceSelector: string[],
  component: string,
  tag: string | undefined,
  instances: Instances,
  props: Props,
  metas: Map<Instance["component"], WsComponentMeta>
): boolean => {
  const selectedInstance = instances.get(selectedInstanceId);

  if (!selectedInstance) {
    return false;
  }

  // Create a test instance with the new component/tag
  const testInstance: Instance = {
    ...selectedInstance,
    component,
  };

  if (tag || component === elementComponent) {
    testInstance.tag = tag ?? "div";
  } else {
    // For components with presetStyle (like Heading, Box), infer default tag
    const meta = metas.get(component);
    const defaultTag = Object.keys(
      (meta as { presetStyle?: Record<string, unknown> })?.presetStyle ?? {}
    ).at(0);
    if (defaultTag) {
      testInstance.tag = defaultTag;
    }
  }

  const newInstances = new Map(instances);
  newInstances.set(testInstance.id, testInstance);

  // Validate the converted instance satisfies content model
  return isTreeSatisfyingContentModel({
    instances: newInstances,
    props,
    metas,
    instanceSelector: selectedInstanceSelector,
  });
};

export const convertInstance = (component: string, tag?: string) => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem] = instancePath;
  const selectedInstance = selectedItem.instance;
  const selectedInstanceSelector = selectedItem.instanceSelector;
  const metas = $registeredComponentMetas.get();
  const instanceTags = $instanceTags.get();
  try {
    updateWebstudioData((data) => {
      const instance = data.instances.get(selectedInstance.id);
      if (instance === undefined) {
        return;
      }
      instance.component = component;
      // convert to specified tag or with currently used
      if (tag || component === elementComponent) {
        instance.tag = tag ?? instanceTags.get(selectedInstance.id) ?? "div";
        // delete legacy tag prop if specified
        for (const prop of data.props.values()) {
          if (prop.instanceId !== selectedInstance.id) {
            continue;
          }
          if (prop.name === "tag") {
            data.props.delete(prop.id);
            continue;
          }
          const newName = reactPropsToStandardAttributes[prop.name];
          if (newName) {
            const newId = `${prop.instanceId}:${newName}`;
            data.props.delete(prop.id);
            data.props.set(newId, { ...prop, id: newId, name: newName });
          }
        }
      }
      const isSatisfying = isTreeSatisfyingContentModel({
        instances: data.instances,
        props: data.props,
        metas,
        instanceSelector: selectedInstanceSelector,
      });
      if (isSatisfying === false) {
        const label = getInstanceLabel({ component, tag });
        toast.error(`Cannot convert to ${label}`);
        throw Error("Abort transaction");
      }
    });
  } catch {
    // do nothing
  }
};

export const unwrapInstance = () => {
  const instancePath = $selectedInstancePath.get();
  if (instancePath === undefined || !canUnwrapInstance(instancePath)) {
    return;
  }

  const [selectedItem, parentItem] = instancePath;

  try {
    updateWebstudioData((data) => {
      const result = unwrapInstanceMutable({
        instances: data.instances,
        props: data.props,
        metas: $registeredComponentMetas.get(),
        selectedItem,
        parentItem,
      });

      if (!result.success) {
        toast.error(result.error ?? "Cannot unwrap instance");
        throw Error("Abort transaction");
      }
    });
    // After unwrap, select the child that replaced the parent
    selectInstance([
      selectedItem.instance.id,
      ...parentItem.instanceSelector.slice(1),
    ]);
  } catch {
    // do nothing
  }
};

export const deleteSelectedInstance = () => {
  if ($isPreviewMode.get()) {
    return;
  }
  const textEditingInstanceSelector = $textEditingInstanceSelector.get();
  const instancePath = $selectedInstancePath.get();
  // cannot delete instance while editing
  if (textEditingInstanceSelector) {
    return;
  }
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem, parentItem] = instancePath;
  const selectedInstanceSelector = selectedItem.instanceSelector;
  const instances = $instances.get();
  if (!isComponentDetachable(selectedItem.instance.component)) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
    return false;
  }

  if ($isContentMode.get()) {
    // In content mode we are allowing to delete childen of the editable block
    const editableInstanceSelector = findBlockSelector(
      selectedInstanceSelector,
      instances
    );
    if (editableInstanceSelector === undefined) {
      builderApi.toast.info("You can't delete this instance in conent mode.");
      return;
    }

    const isChildOfBlock =
      selectedInstanceSelector.length - editableInstanceSelector.length === 1;

    const isTemplateInstance =
      instances.get(selectedInstanceSelector[0])?.component ===
      blockTemplateComponent;

    if (isTemplateInstance) {
      builderApi.toast.info("You can't delete this instance in content mode.");
      return;
    }

    if (!isChildOfBlock) {
      builderApi.toast.info("You can't delete this instance in content mode.");
      return;
    }
  }

  // find next selected instance
  let newSelectedInstanceSelector: undefined | InstanceSelector;
  const parentInstanceSelector = parentItem.instanceSelector;
  const siblingIds = parentItem.instance.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);
  const position = siblingIds.indexOf(selectedItem.instance.id);
  const siblingId = siblingIds[position + 1] ?? siblingIds[position - 1];
  if (siblingId) {
    // select next or previous sibling if possible
    newSelectedInstanceSelector = [siblingId, ...parentInstanceSelector];
  } else {
    // fallback to parent
    newSelectedInstanceSelector = parentInstanceSelector;
  }
  updateWebstudioData((data) => {
    if (deleteInstanceMutable(data, instancePath)) {
      selectInstance(newSelectedInstanceSelector);
    }
  });
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
    value.type === "color" ||
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
  if (value.type === "shadow") {
    traverseStyleValue(value.offsetX, callback);
    traverseStyleValue(value.offsetY, callback);
    if (value.blur) {
      traverseStyleValue(value.blur, callback);
    }
    if (value.spread) {
      traverseStyleValue(value.spread, callback);
    }
    if (value.color) {
      traverseStyleValue(value.color, callback);
    }
    return;
  }
  value satisfies never;
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
  const fragmentBreapoints: Breakpoints = new Map();
  for (const styleDecl of fragmentStyles) {
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
    breakpoints: Array.from(fragmentBreapoints.values()),
    styles: fragmentStyles,
    dataSources: Array.from(fragmentDataSources.values()),
    resources: fragmentResources,
    props: fragmentProps,
    assets: fragmentAssets,
  };
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
  availableVariables,
  projectId,
  conflictResolution = "theirs",
}: {
  data: Omit<WebstudioData, "pages">;
  fragment: WebstudioFragment;
  availableVariables: DataSource[];
  projectId: Project["id"];
  conflictResolution?: ConflictResolution;
}) => {
  const newInstanceIds = new Map<Instance["id"], Instance["id"]>();
  const newDataSourceIds = new Map<DataSource["id"], DataSource["id"]>();
  const newDataIds = {
    newInstanceIds,
    newDataSourceIds,
  };

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

  const mergedBreakpointIds = buildMergedBreakpointIds(
    fragment.breakpoints,
    breakpoints
  );
  for (const newBreakpoint of fragment.breakpoints) {
    if (mergedBreakpointIds.has(newBreakpoint.id) === false) {
      breakpoints.set(newBreakpoint.id, newBreakpoint);
    }
  }

  // insert tokens with their styles

  const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
    insertStyleSources({
      fragmentStyleSources: fragment.styleSources,
      fragmentStyles: fragment.styles,
      existingStyleSources: styleSources,
      existingStyles: styles,
      breakpoints,
      mergedBreakpointIds,
      conflictResolution,
    });

  // Update styleSources map with the new tokens
  for (const [id, styleSource] of updatedStyleSources) {
    styleSources.set(id, styleSource);
  }

  for (const styleDecl of fragment.styles) {
    if (styleSourceIds.has(styleDecl.styleSourceId)) {
      const { breakpointId } = styleDecl;
      const newStyleDecl: StyleDecl = {
        ...styleDecl,
        breakpointId: mergedBreakpointIds.get(breakpointId) ?? breakpointId,
        // Remap the styleSourceId to the new token ID
        styleSourceId:
          styleSourceIdMap.get(styleDecl.styleSourceId) ??
          styleDecl.styleSourceId,
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

    for (const instance of fragment.instances) {
      if (instanceIds.has(instance.id)) {
        instances.set(instance.id, instance);
      }
    }

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

  const maskedIdByName = new Map<DataSource["name"], DataSource["id"]>();
  for (const dataSource of availableVariables) {
    maskedIdByName.set(dataSource.name, dataSource.id);
  }
  const newResourceIds = new Map<Resource["id"], Resource["id"]>();
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
      const newDataSourceId = nanoid();
      newDataSourceIds.set(dataSource.id, newDataSourceId);
      dataSource = structuredClone(unwrap(dataSource));
      dataSource.id = newDataSourceId;
      dataSource.scopeInstanceId =
        newInstanceIds.get(scopeInstanceId) ?? scopeInstanceId;
      if (dataSource.type === "resource") {
        const newResourceId = nanoid();
        newResourceIds.set(dataSource.resourceId, newResourceId);
        dataSource.resourceId = newResourceId;
      }
      dataSources.set(dataSource.id, dataSource);
    }
  }

  for (let prop of fragment.props) {
    if (fragmentInstanceIds.has(prop.instanceId) === false) {
      continue;
    }
    prop = structuredClone(unwrap(prop));
    prop.id = nanoid();
    prop.instanceId = newInstanceIds.get(prop.instanceId) ?? prop.instanceId;
    if (prop.type === "expression") {
      prop.value = restoreExpressionVariables({
        expression: prop.value,
        maskedIdByName,
      });
      prop.value = replaceDataSources(prop.value, newDataSourceIds);
    }
    if (prop.type === "action") {
      for (const value of prop.value) {
        value.code = restoreExpressionVariables({
          expression: value.code,
          maskedIdByName,
        });
        value.code = replaceDataSources(value.code, newDataSourceIds);
      }
    }
    if (prop.type === "parameter") {
      prop.value = newDataSourceIds.get(prop.value) ?? prop.value;
    }
    if (prop.type === "resource") {
      const newResourceId = nanoid();
      newResourceIds.set(prop.value, newResourceId);
      prop.value = newResourceId;
    }
    props.set(prop.id, prop);
  }

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
    resource.url = replaceDataSources(resource.url, newDataSourceIds);
    for (const header of resource.headers) {
      header.value = restoreExpressionVariables({
        expression: header.value,
        maskedIdByName,
      });
      header.value = replaceDataSources(header.value, newDataSourceIds);
    }
    if (resource.searchParams) {
      for (const searchParam of resource.searchParams) {
        searchParam.value = restoreExpressionVariables({
          expression: searchParam.value,
          maskedIdByName,
        });
        searchParam.value = replaceDataSources(
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
      resource.body = replaceDataSources(resource.body, newDataSourceIds);
    }
    resources.set(resource.id, resource);
  }

  for (let instance of fragment.instances) {
    if (fragmentInstanceIds.has(instance.id)) {
      instance = structuredClone(unwrap(instance));
      instance.id = newInstanceIds.get(instance.id) ?? instance.id;
      for (const child of instance.children) {
        if (child.type === "id") {
          child.value = newInstanceIds.get(child.value) ?? child.value;
        }
        if (child.type === "expression") {
          child.value = restoreExpressionVariables({
            expression: child.value,
            maskedIdByName,
          });
          child.value = replaceDataSources(child.value, newDataSourceIds);
        }
      }
      instances.set(instance.id, instance);
    }
  }

  // insert local styles with new ids

  insertLocalStyleSourcesWithNewIds({
    fragmentStyleSources: fragment.styleSources,
    fragmentStyleSourceSelections: fragment.styleSourceSelections,
    fragmentStyles: fragment.styles,
    fragmentInstanceIds,
    newInstanceIds,
    styleSourceIdMap,
    styleSources,
    styleSourceSelections,
    styles,
    mergedBreakpointIds,
  });

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
  position: number | "end" | "after";
};

export const findClosestInsertable = (
  fragment: WebstudioFragment,
  from?: Insertable
): undefined | Insertable => {
  const selectedPage = $selectedPage.get();
  const awareness = $awareness.get();
  if (selectedPage === undefined) {
    return;
  }
  // paste to the page root if nothing is selected
  const instanceSelector = from?.parentSelector ??
    awareness?.instanceSelector ?? [selectedPage.rootInstanceId];
  if (instanceSelector[0] === ROOT_INSTANCE_ID) {
    toast.error(`Cannot insert into Global Root`);
    return;
  }
  const metas = $registeredComponentMetas.get();
  const instances = $instances.get();
  const props = $props.get();
  const containerSelector = findClosestNonTextualContainer({
    metas,
    props,
    instances,
    instanceSelector,
  });
  const closestContainerIndex =
    instanceSelector.length - containerSelector.length;
  if (closestContainerIndex === -1) {
    return;
  }
  let insertableIndex = findClosestInstanceMatchingFragment({
    metas,
    instances,
    props,
    instanceSelector: instanceSelector.slice(closestContainerIndex),
    fragment,
    onError: (message) => {
      const component = fragment.instances[0].component;
      const label = getInstanceLabel({ component });
      toast.warn(message || `"${label}" has no place here`);
    },
  });
  if (insertableIndex === -1) {
    // fallback to closest container to always insert something
    // even when validation fails
    insertableIndex = 0;
  }

  // adjust with container lookup
  insertableIndex = insertableIndex + closestContainerIndex;
  const parentSelector = instanceSelector.slice(insertableIndex);
  if (insertableIndex === 0) {
    return from ?? { parentSelector, position: "end" };
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

/**
 * Build the ancestor path array for an instance.
 * Returns an array of labels for all ancestors from root to parent.
 */
export const buildInstancePath = (
  instanceId: Instance["id"],
  pages: Pages,
  instances: Instances
): string[] => {
  const awareness = findAwarenessByInstanceId(pages, instances, instanceId);
  if (!awareness.instanceSelector) {
    return [];
  }

  const instancePath = getInstancePath(
    awareness.instanceSelector,
    instances,
    undefined,
    undefined
  );

  if (!instancePath) {
    return [];
  }

  return instancePath
    .slice()
    .reverse()
    .slice(0, -1) // Remove the instance itself (last element after reverse), keep only ancestors
    .map(({ instance }) => getInstanceLabel(instance));
};

/**
 * Detects token conflicts for a fragment insertion.
 *
 * @param fragment - The fragment to check for conflicts
 * @returns Array of token conflicts (empty if no conflicts)
 */
export const detectFragmentTokenConflicts = ({
  fragment,
}: {
  fragment: WebstudioFragment;
}) => {
  const data = getWebstudioData();

  const mergedBreakpointIds = buildMergedBreakpointIds(
    fragment.breakpoints,
    data.breakpoints
  );

  return detectTokenConflicts({
    fragmentStyleSources: fragment.styleSources,
    fragmentStyles: fragment.styles,
    existingStyleSources: data.styleSources,
    existingStyles: data.styles,
    breakpoints: data.breakpoints,
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
  pageId,
}: {
  sourceData: WebstudioData;
  pageId: string;
}) => {
  const data = getWebstudioData();

  const page = sourceData.pages.pages.find((p) => p.id === pageId);
  if (page === undefined && sourceData.pages.homePage.id !== pageId) {
    throw new Error("Page not found");
  }
  const targetPage = page ?? sourceData.pages.homePage;

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
    data.breakpoints
  );

  return detectTokenConflicts({
    fragmentStyleSources: combinedStyleSources,
    fragmentStyles: combinedStyles,
    existingStyleSources: data.styleSources,
    existingStyles: data.styles,
    breakpoints: data.breakpoints,
    mergedBreakpointIds,
  });
};
