// Mutation utilities own changing existing instances in the live tree: delete,
// reparent, wrap, unwrap, convert, and visibility toggles. Put operations that
// move or transform existing nodes here; use insert.ts for new content and
// slot.ts for shared Slot boundary rules.
import { nanoid } from "nanoid";
import { toast } from "@webstudio-is/design-system";
import { builderApi } from "~/shared/builder-api";
import { showAttribute } from "@webstudio-is/react-sdk";
import {
  type Instance,
  type Instances,
  type Props,
  type WebstudioData,
  type WsComponentMeta,
  elementComponent,
  findTreeInstanceIds,
  isComponentDetachable,
} from "@webstudio-is/sdk";
import { reactPropsToStandardAttributes } from "@webstudio-is/react-sdk";
import {
  $isContentMode,
  $isPreviewMode,
  $registeredComponentMetas,
  $selectedInstancePath,
  $selectedPage,
  $textEditingInstanceSelector,
  getInstancePath,
  selectInstance,
  type InstancePath,
} from "../nano-states";
import { $instances, $project, $props } from "../sync/data-stores";
import { removeByMutable } from "../array-utils";
import { serverSyncStore } from "../sync/sync-stores";
import {
  findAvailableVariables,
  rebindTreeVariablesMutable,
} from "@webstudio-is/project-build/runtime/data";
import {
  createInstanceChild,
  getSameParentAdjustedInsertIndex,
} from "@webstudio-is/project-build/runtime/instances";
import {
  isRichTextContent,
  isTreeSatisfyingContentModel,
} from "../content-model";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $instanceTags } from "~/builder/features/style-panel/shared/model";
import {
  getDirectSharedSlotChildBoundary,
  getSharedSlotBoundary,
  getSlotFragmentDropTargetMutable,
  getSlotFragmentId,
  normalizeLegacySlotInstancePathMutable,
  normalizeLegacySlotParentInSelectorMutable,
  prepareSlotReparentMutable,
  type SharedSlotDetachResult,
} from "./slot";
import {
  type DroppableTarget,
  type InstanceSelector,
  getReparentDropTargetMutable,
} from "./tree";
import {
  createInstanceDeletePayload,
  findChildReferenceIndex,
} from "@webstudio-is/project-build/runtime/instances";
import {
  applyBuilderPatchPayloadMutable,
  canDeleteInstanceInContentMode,
  updateInstanceData,
  updateWebstudioData,
  type WebstudioInstanceData,
} from "./data";
import {
  createPropDeletePayload,
  createPropRenamePayload,
} from "@webstudio-is/project-build/runtime/props";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "@webstudio-is/project-build/runtime/fragment";

const getSlotChildrenSignature = (instance: Instance) => {
  return JSON.stringify(instance.children);
};

export const setInstanceLabelMutable = (
  instances: Instances,
  instanceId: Instance["id"],
  label: undefined | string
) => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }
  if (instance.component !== "Slot") {
    instance.label = label;
    return;
  }
  const slotChildrenSignature = getSlotChildrenSignature(instance);
  for (const currentInstance of instances.values()) {
    if (
      currentInstance.component === "Slot" &&
      getSlotChildrenSignature(currentInstance) === slotChildrenSignature
    ) {
      currentInstance.label = label;
    }
  }
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
  sourceInstanceSelector = normalizeLegacySlotParentInSelectorMutable(
    data.instances,
    sourceInstanceSelector
  );
  const initialSourceInstancePath = getInstancePath(
    sourceInstanceSelector,
    data.instances
  );
  const reparentSource = prepareSharedSlotReparentMutable(
    initialSourceInstancePath ?? [],
    dropTarget
  );
  const sourceInstancePath = reparentSource.instancePath;
  dropTarget = reparentSource.dropTarget;
  sourceInstanceSelector = sourceInstancePath[0]?.instanceSelector;
  if (sourceInstanceSelector === undefined) {
    return;
  }
  const [rootInstanceId] = sourceInstanceSelector;
  // detect if target is one of own descendants
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
  // Slot drops must target the shared Fragment before same-parent detection.
  // Legacy slots may still store content directly under Slot, and delaying this
  // normalization lets the first child look like the parent drop container.
  dropTarget =
    getSlotFragmentDropTargetMutable(data.instances, dropTarget) ?? dropTarget;
  // move within same parent
  if (sourceInstanceSelector[1] === dropTarget.parentSelector[0]) {
    reorderInstanceWithinParentMutable(data, rootInstanceId, dropTarget);
    return sourceInstanceSelector;
  }
  // move into another parent
  return moveInstanceToParentMutable(
    data,
    rootInstanceId,
    sourceInstancePath,
    dropTarget
  );
};

export const reparentInstance = (
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  updateWebstudioData(
    (data) => {
      const newSelector = reparentInstanceMutable(
        data,
        sourceInstanceSelector,
        dropTarget
      );
      selectInstance(newSelector);
    },
    { validateInstances: false }
  );
};

const countInstanceChildReferences = (
  instances: Instances,
  instanceId: Instance["id"]
) => {
  let count = 0;
  for (const instance of instances.values()) {
    for (const child of instance.children) {
      if (child.type === "id" && child.value === instanceId) {
        count += 1;
      }
    }
  }
  return count;
};

const removeChildReferenceMutable = (
  children: Instance["children"],
  instanceId: Instance["id"]
) => {
  removeByMutable(
    children,
    (child) => child.type === "id" && child.value === instanceId
  );
};

const replaceChildReferenceMutable = (
  parentInstance: Instance,
  previousChildId: Instance["id"],
  nextChildId: Instance["id"]
) => {
  const childIndex = findChildReferenceIndex(
    parentInstance.children,
    previousChildId
  );
  if (childIndex !== -1) {
    parentInstance.children[childIndex] = createInstanceChild(nextChildId);
  }
};

const removeMovedInstanceFromParentMutable = (
  data: Omit<WebstudioData, "pages">,
  instancePath: InstancePath
) => {
  const targetInstance = instancePath[0]?.instance;
  const parentItem = instancePath[1];
  const grandparentItem = instancePath[2];
  if (targetInstance === undefined || parentItem === undefined) {
    return;
  }
  const parentInstance = data.instances.get(parentItem.instance.id);
  if (parentInstance === undefined) {
    return;
  }
  removeChildReferenceMutable(parentInstance.children, targetInstance.id);
  if (
    parentInstance.component === "Fragment" &&
    parentInstance.children.length === 0 &&
    grandparentItem !== undefined &&
    countInstanceChildReferences(data.instances, parentInstance.id) < 2
  ) {
    const grandparentInstance = data.instances.get(grandparentItem.instance.id);
    removeChildReferenceMutable(
      grandparentInstance?.children ?? [],
      parentInstance.id
    );
    data.instances.delete(parentInstance.id);
  }
};

const reorderInstanceWithinParentMutable = (
  data: Omit<WebstudioData, "pages">,
  rootInstanceId: Instance["id"],
  dropTarget: DroppableTarget
) => {
  const [parentId] = dropTarget.parentSelector;
  const parent = data.instances.get(parentId);
  if (parent === undefined) {
    return;
  }
  const prevPosition = findChildReferenceIndex(parent.children, rootInstanceId);
  const child = parent.children[prevPosition];
  if (child === undefined) {
    return;
  }
  parent.children.splice(prevPosition, 1);
  if (dropTarget.position === "end") {
    parent.children.push(child);
    return;
  }
  // When parent is the same, account for removal before reinserting.
  const nextPosition = getSameParentAdjustedInsertIndex({
    currentIndex: prevPosition,
    requestedIndex: dropTarget.position,
  });
  parent.children.splice(nextPosition, 0, child);
};

const moveInstanceToParentMutable = (
  data: Omit<WebstudioData, "pages">,
  rootInstanceId: Instance["id"],
  sourceInstancePath: InstancePath,
  dropTarget: DroppableTarget
) => {
  // Prepare drop target before removing the instance so empty Slot fragments can
  // be created or reused while the current tree is still intact.
  dropTarget =
    getReparentDropTargetMutable(
      data.instances,
      data.props,
      $registeredComponentMetas.get(),
      dropTarget
    ) ?? dropTarget;
  removeMovedInstanceFromParentMutable(data, sourceInstancePath);
  const [newParentId] = dropTarget.parentSelector;
  const newParent = data.instances.get(newParentId);
  const newChild = createInstanceChild(rootInstanceId);
  if (dropTarget.position === "end") {
    newParent?.children.push(newChild);
  } else {
    newParent?.children.splice(dropTarget.position, 0, newChild);
  }
  rebindTreeVariablesMutable({
    startingInstanceId: rootInstanceId,
    pages: undefined,
    instances: data.instances,
    props: data.props,
    dataSources: data.dataSources,
    resources: data.resources,
  });
  return [rootInstanceId, ...dropTarget.parentSelector];
};

const getDeleteTarget = (
  instances: Instances,
  instancePath: InstancePath
): Instance => {
  let targetInstance = instancePath[0].instance;
  let parentInstance = instancePath[1]?.instance;
  const grandparentInstance = instancePath[2]?.instance;

  // Delete the wrapper Fragment too when deleting its last child. Empty Slot
  // Fragments use display: contents and do not render correctly on canvas.
  if (
    parentInstance?.component === "Fragment" &&
    parentInstance.children.length === 1 &&
    grandparentInstance &&
    countInstanceChildReferences(instances, parentInstance.id) < 2
  ) {
    targetInstance = parentInstance;
    parentInstance = grandparentInstance;
  }

  return targetInstance;
};

export const deleteInstanceMutable = (
  data: WebstudioInstanceData,
  instancePath: undefined | InstancePath
) => {
  if (instancePath === undefined) {
    return false;
  }
  instancePath = normalizeLegacySlotInstancePathMutable(
    data.instances,
    instancePath
  );
  const targetInstance = getDeleteTarget(data.instances, instancePath);
  const { errors, payload } = createInstanceDeletePayload({
    instances: data.instances,
    instanceIds: [targetInstance.id],
    props: data.props.values(),
    dataSources: data.dataSources.values(),
    styleSources: data.styleSources.values(),
    styleSourceSelections: data.styleSourceSelections.values(),
    styles: data.styles.values(),
  });
  if (errors.length > 0) {
    return false;
  }
  applyBuilderPatchPayloadMutable(data, payload);
  return true;
};

const getInstancePathSiblingIndex = (instancePath: InstancePath) => {
  const selectedItem = instancePath[0];
  const parentItem = instancePath[1];
  if (parentItem === undefined) {
    return -1;
  }
  return findChildReferenceIndex(
    parentItem.instance.children,
    selectedItem.instance.id
  );
};

export const sortInstancePathsForChildMutation = <
  Item extends { instancePath: InstancePath },
>(
  items: Item[]
) =>
  [...items].sort((left, right) => {
    const depthDiff = right.instancePath.length - left.instancePath.length;
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return (
      getInstancePathSiblingIndex(right.instancePath) -
      getInstancePathSiblingIndex(left.instancePath)
    );
  });

const cloneSharedSlotFragmentMutable = (
  data: Omit<WebstudioData, "pages">,
  slotId: Instance["id"],
  fragmentId: Instance["id"]
) => {
  if (countInstanceChildReferences(data.instances, fragmentId) < 2) {
    return;
  }
  const projectId = $project.get()?.id ?? "";
  const fragment = extractWebstudioFragment(data, fragmentId);
  const { newInstanceIds } = insertWebstudioFragmentCopy({
    data,
    fragment,
    availableVariables: findAvailableVariables({
      ...data,
      startingInstanceId: slotId,
    }),
    projectId,
  });
  const newFragmentId = newInstanceIds.get(fragmentId);
  const slot = data.instances.get(slotId);
  if (slot === undefined || newFragmentId === undefined) {
    return;
  }
  replaceChildReferenceMutable(slot, fragmentId, newFragmentId);
  return newInstanceIds;
};

export const detachSharedSlotChildrenMutable = (
  data: Omit<WebstudioData, "pages">,
  slotId: Instance["id"]
) => {
  const slot = data.instances.get(slotId);
  const fragmentId = getSlotFragmentId(slot);
  if (fragmentId === undefined) {
    return;
  }
  cloneSharedSlotFragmentMutable(data, slotId, fragmentId);
};

const detachSharedSlotContentMutableWithMap = (
  data: Omit<WebstudioData, "pages">,
  instancePath: InstancePath
): SharedSlotDetachResult => {
  const boundary = getSharedSlotBoundary(instancePath);
  if (boundary === undefined) {
    return { instancePath };
  }
  const newInstanceIds = cloneSharedSlotFragmentMutable(
    data,
    boundary.slotId,
    boundary.fragmentId
  );
  if (newInstanceIds === undefined) {
    return { instancePath };
  }
  const newInstanceSelector = instancePath[0].instanceSelector.map(
    (instanceId, index) =>
      index < boundary.slotIndex
        ? (newInstanceIds.get(instanceId) ?? instanceId)
        : instanceId
  );
  return {
    instancePath:
      getInstancePath(newInstanceSelector, data.instances) ?? instancePath,
    newInstanceIds,
    fragmentId: boundary.fragmentId,
    slotId: boundary.slotId,
  };
};

const prepareSharedSlotReparentMutable = (
  instancePath: InstancePath,
  dropTarget: DroppableTarget
): { instancePath: InstancePath; dropTarget: DroppableTarget } => {
  // Reparenting a Slot child mutates the shared Fragment. When the target is
  // outside the Slot, the moved instance becomes independent at its new
  // location and is removed from every occurrence of that Slot.
  return prepareSlotReparentMutable({
    instancePath,
    dropTarget,
  });
};

export const detachSharedSlotContentMutable = (
  data: Omit<WebstudioData, "pages">,
  instancePath: InstancePath
) => {
  return detachSharedSlotContentMutableWithMap(data, instancePath).instancePath;
};

const unwrapDirectSharedSlotChildWithSiblingsMutable = ({
  data,
  selectedItem,
  fragmentItem,
  slotItem,
}: {
  data: WebstudioData;
  selectedItem: InstancePath[number];
  fragmentItem: InstancePath[number];
  slotItem: InstancePath[number];
}) => {
  if (fragmentItem.instance.children.length <= 1) {
    return;
  }
  const slotParentId = slotItem.instanceSelector[1];
  const slotParent = data.instances.get(slotParentId);
  if (slotParent === undefined) {
    return;
  }
  removeChildReferenceMutable(
    fragmentItem.instance.children,
    selectedItem.instance.id
  );
  const slotPosition = findChildReferenceIndex(
    slotParent.children,
    slotItem.instance.id
  );
  if (slotPosition === -1) {
    return;
  }
  slotParent.children.splice(
    slotPosition + 1,
    0,
    createInstanceChild(selectedItem.instance.id)
  );
  const nextSelectedInstanceSelector = [
    selectedItem.instance.id,
    ...slotItem.instanceSelector.slice(1),
  ];
  const matches = isTreeSatisfyingContentModel({
    instances: data.instances,
    props: data.props,
    metas: $registeredComponentMetas.get(),
    instanceSelector: nextSelectedInstanceSelector,
  });
  if (matches === false) {
    toast.error("Cannot unwrap instance");
    throw Error("Abort transaction");
  }
  return nextSelectedInstanceSelector;
};

const prepareUnwrapInstancePathMutable = (
  data: WebstudioData,
  instancePath: InstancePath
): {
  instancePath: InstancePath;
  directSlotBoundary?: ReturnType<typeof getDirectSharedSlotChildBoundary>;
} => {
  const normalizedInstancePath = normalizeLegacySlotInstancePathMutable(
    data.instances,
    instancePath
  );
  if (getDirectSharedSlotChildBoundary(normalizedInstancePath) === undefined) {
    return { instancePath: normalizedInstancePath };
  }
  return {
    instancePath: normalizedInstancePath,
    directSlotBoundary: getDirectSharedSlotChildBoundary(
      normalizedInstancePath
    ),
  };
};

const getUnwrappedInstanceSelector = ({
  selectedItem,
  parentItem,
}: {
  selectedItem: { instance: { id: Instance["id"] } };
  parentItem: { instanceSelector: InstanceSelector };
}) => [selectedItem.instance.id, ...parentItem.instanceSelector.slice(1)];

const validateUnwrappedInstance = ({
  instances,
  props,
  metas,
  selectedItem,
  parentItem,
}: {
  instances: Map<string, Instance>;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  selectedItem: { instance: { id: Instance["id"] } };
  parentItem: { instanceSelector: InstanceSelector };
}) => {
  return isTreeSatisfyingContentModel({
    instances,
    props,
    metas,
    instanceSelector: getUnwrappedInstanceSelector({
      selectedItem,
      parentItem,
    }),
  });
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

  const selectedParentId = selectedItem.instanceSelector[1];
  const selectedParentInstance = instances.get(selectedParentId);
  if (
    parentInstance.component === "Slot" &&
    selectedParentInstance?.component === "Fragment" &&
    selectedItem.instanceSelector[2] === parentItem.instance.id &&
    selectedParentInstance.children.length === 1 &&
    selectedParentInstance.children[0]?.type === "id" &&
    selectedParentInstance.children[0].value === selectedItem.instance.id
  ) {
    removeChildReferenceMutable(
      selectedParentInstance.children,
      selectedItem.instance.id
    );
    replaceChildReferenceMutable(
      grandparentInstance,
      parentItem.instance.id,
      selectedItem.instance.id
    );

    if (countInstanceChildReferences(instances, parentItem.instance.id) === 0) {
      instances.delete(parentItem.instance.id);
    }
    if (
      countInstanceChildReferences(instances, selectedParentInstance.id) === 0
    ) {
      instances.delete(selectedParentInstance.id);
    }

    const matches = validateUnwrappedInstance({
      instances,
      props,
      metas,
      selectedItem,
      parentItem,
    });
    if (matches === false) {
      return { success: false, error: "Cannot unwrap instance" };
    }

    return { success: true };
  }

  // Slot children may be rendered through multiple slot instances with the same
  // ids. Unwrapping a direct Slot child moves the child out of shared Slot
  // content, so the child is removed from all occurrences of that Slot.
  if (instances.get(parentItem.instanceSelector[1])?.component === "Slot") {
    replaceChildReferenceMutable(
      grandparentInstance,
      parentItem.instance.id,
      selectedItem.instance.id
    );

    const matches = validateUnwrappedInstance({
      instances,
      props,
      metas,
      selectedItem,
      parentItem,
    });
    if (matches === false) {
      return { success: false, error: "Cannot unwrap instance" };
    }

    return { success: true };
  }

  // Remove selected instance from parent's children
  const selectedIndexInParent = findChildReferenceIndex(
    parentInstance.children,
    selectedItem.instance.id
  );
  if (selectedIndexInParent !== -1) {
    parentInstance.children.splice(selectedIndexInParent, 1);
  }

  // If parent has no more children, delete it
  if (parentInstance.children.length === 0) {
    instances.delete(parentItem.instance.id);
  }

  // Add selected instance to grandparent at parent's position
  const parentIndex = findChildReferenceIndex(
    grandparentInstance.children,
    parentItem.instance.id
  );
  if (parentIndex !== -1) {
    if (parentInstance.children.length === 0) {
      // Replace parent with selected if parent is now empty
      replaceChildReferenceMutable(
        grandparentInstance,
        parentItem.instance.id,
        selectedItem.instance.id
      );
    } else {
      // Insert selected after parent if parent still has children
      grandparentInstance.children.splice(
        parentIndex + 1,
        0,
        createInstanceChild(selectedItem.instance.id)
      );
    }
  }

  const matches = validateUnwrappedInstance({
    instances,
    props,
    metas,
    selectedItem,
    parentItem,
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
  if (parentItem.instance.component === "Slot") {
    return true;
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
  const newInstanceId = nanoid();
  let newInstanceSelector: InstanceSelector | undefined;
  const metas = $registeredComponentMetas.get();

  try {
    updateWebstudioData((data) => {
      const nextInstancePath = normalizeLegacySlotInstancePathMutable(
        data.instances,
        instancePath
      );
      const [selectedItem, parentItem] = nextInstancePath;
      if (parentItem === undefined) {
        return;
      }
      const selectedInstance = selectedItem.instance;
      const nextInstanceSelector = [
        newInstanceId,
        ...parentItem.instanceSelector,
      ];
      newInstanceSelector = nextInstanceSelector;
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
        children: [createInstanceChild(selectedInstance.id)],
      };

      if (tag || component === elementComponent) {
        newInstance.tag = tag ?? "div";
      }
      const parentInstance = data.instances.get(parentItem.instance.id);
      data.instances.set(newInstanceId, newInstance);
      if (parentInstance) {
        replaceChildReferenceMutable(
          parentInstance,
          selectedInstance.id,
          newInstanceId
        );
      }

      const isSatisfying = isTreeSatisfyingContentModel({
        instances: data.instances,
        props: data.props,
        metas,
        instanceSelector: nextInstanceSelector,
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
  const metas = $registeredComponentMetas.get();
  const instanceTags = $instanceTags.get();
  try {
    updateWebstudioData((data) => {
      const [initialSelectedItem] = instancePath;
      if (initialSelectedItem.instance.component === "Slot") {
        getSlotFragmentDropTargetMutable(data.instances, {
          parentSelector: initialSelectedItem.instanceSelector,
          position: "end",
        });
      }
      const nextInstancePath = normalizeLegacySlotInstancePathMutable(
        data.instances,
        instancePath
      );
      const [selectedItem] = nextInstancePath;
      const selectedInstance = selectedItem.instance;
      const selectedInstanceSelector = selectedItem.instanceSelector;
      if (selectedInstance.component === "Slot" && component !== "Slot") {
        detachSharedSlotChildrenMutable(data, selectedInstance.id);
      }
      const instance = data.instances.get(selectedInstance.id);
      if (instance === undefined) {
        return;
      }
      instance.component = component;
      // convert to specified tag or with currently used
      if (tag || component === elementComponent) {
        instance.tag = tag ?? instanceTags.get(selectedInstance.id) ?? "div";
        // delete legacy tag prop if specified
        for (const prop of Array.from(data.props.values())) {
          if (prop.instanceId !== selectedInstance.id) {
            continue;
          }
          if (prop.name === "tag") {
            applyBuilderPatchPayloadMutable(
              data,
              createPropDeletePayload({
                deletions: [
                  { instanceId: selectedInstance.id, name: prop.name },
                ],
                instances: data.instances,
                props: data.props.values(),
              }).payload
            );
            continue;
          }
          const newName = reactPropsToStandardAttributes[prop.name];
          if (newName) {
            applyBuilderPatchPayloadMutable(
              data,
              createPropRenamePayload({
                props: data.props.values(),
                renames: [
                  {
                    propId: prop.id,
                    name: newName,
                    propIdPrefix: prop.instanceId,
                  },
                ],
              }).payload
            );
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

  try {
    updateWebstudioData((data) => {
      const { instancePath: nextInstancePath, directSlotBoundary } =
        prepareUnwrapInstancePathMutable(data, instancePath);
      const [selectedItem, defaultParentItem] = nextInstancePath;
      // Unwrapping a direct Slot child places that child outside the Slot, so it
      // intentionally leaves shared Slot content and must use the Slot item as
      // the parent to replace.
      const parentItem = directSlotBoundary?.slotItem ?? defaultParentItem;
      if (parentItem === undefined) {
        return;
      }

      const directSlotUnwrapSelector = directSlotBoundary
        ? unwrapDirectSharedSlotChildWithSiblingsMutable({
            data,
            selectedItem,
            fragmentItem: directSlotBoundary.fragmentItem,
            slotItem: parentItem,
          })
        : undefined;
      if (directSlotUnwrapSelector !== undefined) {
        selectInstance(directSlotUnwrapSelector);
        return;
      }

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

      // After unwrap, select the child that replaced the parent.
      selectInstance(
        getUnwrappedInstanceSelector({ selectedItem, parentItem })
      );
    });
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
  const [selectedItem] = instancePath;
  const selectedInstanceSelector = selectedItem.instanceSelector;
  const instances = $instances.get();
  if (!isComponentDetachable(selectedItem.instance.component)) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
    return false;
  }

  if ($isContentMode.get()) {
    if (
      canDeleteInstanceInContentMode({
        instanceSelector: selectedInstanceSelector,
        instances,
      }) === false
    ) {
      builderApi.toast.info("You can't delete this instance in content mode.");
      return;
    }
  }

  updateInstanceData((data) => {
    const normalizedInstancePath = normalizeLegacySlotInstancePathMutable(
      data.instances,
      instancePath
    );
    const [normalizedSelectedItem, parentItem] = normalizedInstancePath;
    if (parentItem === undefined) {
      return;
    }

    // Find next selection after any legacy Slot normalization, otherwise the
    // command can select a direct Slot child path that no longer exists.
    let newSelectedInstanceSelector: undefined | InstanceSelector;
    const parentInstanceSelector = parentItem.instanceSelector;
    const siblingIds = parentItem.instance.children
      .filter((child) => child.type === "id")
      .map((child) => child.value);
    const position = siblingIds.indexOf(normalizedSelectedItem.instance.id);
    const siblingId = siblingIds[position + 1] ?? siblingIds[position - 1];
    if (siblingId) {
      // select next or previous sibling if possible
      newSelectedInstanceSelector = [siblingId, ...parentInstanceSelector];
    } else {
      const grandparentItem = normalizedInstancePath[2];
      // The Slot Fragment is an implementation detail and should never become
      // the visible selection when deleting the last Slot child.
      newSelectedInstanceSelector = getDirectSharedSlotChildBoundary(
        normalizedInstancePath
      )
        ? grandparentItem?.instanceSelector
        : parentInstanceSelector;
    }

    if (deleteInstanceMutable(data, normalizedInstancePath)) {
      selectInstance(newSelectedInstanceSelector);
    }
  });
};
