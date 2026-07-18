import {
  findTreeInstanceIds,
  portalComponent,
  type Instance,
  type Instances,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import { findAvailableVariables, produceWebstudioDataMutation } from "./data";
import { isTreeSatisfyingContentModel } from "./content-model";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./fragment";
import type {
  InstancePath,
  InstancePathItem,
  InstanceSelector,
} from "./instance-path";
import { createRuntimeMutation } from "./mutation";

export type { InstancePath, InstancePathItem } from "./instance-path";

type SlotDropTarget = {
  parentSelector: Instance["id"][];
  position: number | "end";
};

const insertIndexInput = z.number().int().nonnegative();

const createSharedSlot = ({
  id,
  fragmentId,
  label,
}: {
  id: Instance["id"];
  fragmentId: Instance["id"];
  label?: string;
}) => {
  const instance: Instance = {
    type: "instance",
    id,
    component: portalComponent,
    children: [{ type: "id", value: fragmentId }],
  };
  if (label !== undefined) {
    instance.label = label;
  }
  return instance;
};

export const attachSharedSlotInput = z.object({
  sourceSlotId: z.string().min(1),
  parentInstanceId: z.string().min(1),
  insertIndex: insertIndexInput.optional(),
  label: z.string().min(1).optional(),
});

export const extractSharedSlotInput = z.object({
  instanceSelector: z
    .array(z.string().min(1))
    .min(2)
    .describe(
      'Leaf-to-root occurrence path. The first id is the instance to extract, the second is its direct parent, and any remaining ids are successive ancestors toward the page root. Use the id and parentId returned by list-instances; for a section directly under Body, pass ["section-id", "body-id"].'
    ),
  label: z.string().min(1).optional(),
});

export type SharedSlotBoundary = {
  slotIndex: number;
  fragmentItem: InstancePathItem;
  slotItem: InstancePathItem;
  slotParentItem?: InstancePathItem;
  fragmentId: Instance["id"];
  slotId: Instance["id"];
  isDirectChild: boolean;
};

export type SharedSlotDetachResult = {
  instancePath: InstancePath;
  newInstanceIds?: Map<Instance["id"], Instance["id"]>;
  fragmentId?: Instance["id"];
  slotId?: Instance["id"];
};

const areInstanceChildrenEqual = (
  left: Instance["children"],
  right: Instance["children"]
) => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((leftChild, index) => {
    const rightChild = right[index];
    if (rightChild === undefined || leftChild.type !== rightChild.type) {
      return false;
    }
    if (leftChild.type === "id") {
      return rightChild.type === "id" && leftChild.value === rightChild.value;
    }
    return leftChild.value === rightChild.value;
  });
};

export const countInstanceChildReferences = (
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

export const replaceChildReferenceMutable = (
  parentInstance: Instance,
  previousChildId: Instance["id"],
  nextChildId: Instance["id"]
) => {
  const childIndex = parentInstance.children.findIndex(
    (child) => child.type === "id" && child.value === previousChildId
  );
  if (childIndex !== -1) {
    parentInstance.children[childIndex] = { type: "id", value: nextChildId };
  }
};

export const getSlotFragmentId = (slot: undefined | Instance) => {
  if (slot?.component !== "Slot" || slot.children[0]?.type !== "id") {
    return;
  }
  return slot.children[0].value;
};

const getRequiredSlotState = (
  state: Pick<BuilderState, "instances" | "props">
) => {
  if (state.instances === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Instances namespace is missing"
    );
  }
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  return { instances: state.instances, props: state.props };
};

const assertValidSlotPlacement = ({
  instances,
  props,
  instanceSelector,
}: {
  instances: Instances;
  props: NonNullable<BuilderState["props"]>;
  instanceSelector: InstanceSelector;
}) => {
  if (
    isTreeSatisfyingContentModel({
      instances,
      props,
      metas: componentMetas,
      instanceSelector,
    }) === false
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Shared Slot violates the target content model"
    );
  }
};

export const attachSharedSlot = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof attachSharedSlotInput>,
  context: BuilderRuntimeContext
) => {
  const before = getRequiredSlotState(state);
  const slotId = context.createId();
  let fragmentId: Instance["id"] | undefined;
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    const sourceSlot = draft.instances.get(input.sourceSlotId);
    if (sourceSlot?.component !== portalComponent) {
      return throwBuilderRuntimeError("NOT_FOUND", "Source Slot not found");
    }
    getSlotFragmentDropTargetMutable(
      draft.instances,
      { parentSelector: [sourceSlot.id], position: "end" },
      context.createId
    );
    fragmentId = getSlotFragmentId(sourceSlot);
    if (fragmentId === undefined) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Source Slot has no shareable content"
      );
    }
    const target = getSlotFragmentDropTargetMutable(
      draft.instances,
      {
        parentSelector: [input.parentInstanceId],
        position: "end",
      },
      context.createId,
      new Set([fragmentId])
    );
    const parentSelector = target?.parentSelector ?? [input.parentInstanceId];
    const parent = draft.instances.get(parentSelector[0]);
    if (parent === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Target parent not found");
    }
    if (findTreeInstanceIds(draft.instances, fragmentId).has(parent.id)) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Shared Slot cannot be attached inside its own content"
      );
    }
    const slot = createSharedSlot({
      id: slotId,
      fragmentId,
      label: input.label ?? sourceSlot.label,
    });
    draft.instances.set(slot.id, slot);
    if (
      input.insertIndex !== undefined &&
      input.insertIndex > parent.children.length
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Insert index is outside parent children"
      );
    }
    parent.children.splice(input.insertIndex ?? parent.children.length, 0, {
      type: "id",
      value: slot.id,
    });
    assertValidSlotPlacement({
      instances: draft.instances,
      props: draft.props,
      instanceSelector: [slot.id, ...parentSelector],
    });
  });
  const sharedFragmentId =
    fragmentId ??
    throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Source Slot has no shareable content"
    );
  return createRuntimeMutation({
    payload,
    result: { slotId, fragmentId: sharedFragmentId },
    invalidatesNamespaces: ["instances"],
  });
};

export const extractSharedSlot = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof extractSharedSlotInput>,
  context: BuilderRuntimeContext
) => {
  const before = getRequiredSlotState(state);
  const slotId = context.createId();
  const fragmentId = context.createId();
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    const [instanceId, parentId] = input.instanceSelector;
    const selected = draft.instances.get(instanceId);
    const parent = draft.instances.get(parentId);
    if (selected === undefined || parent === undefined) {
      return throwBuilderRuntimeError(
        "NOT_FOUND",
        "Instance or parent not found"
      );
    }
    if (selected.component === portalComponent) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Instance is already a Slot"
      );
    }
    const childIndex = parent.children.findIndex(
      (child) => child.type === "id" && child.value === selected.id
    );
    if (childIndex === -1) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        'instanceSelector must use leaf-to-root order: instanceSelector[1] must be the direct parent of instanceSelector[0]. Use the selected instance id followed by its parentId from list-instances, for example ["section-id", "body-id"].'
      );
    }
    const fragment: Instance = {
      type: "instance",
      id: fragmentId,
      component: "Fragment",
      children: [{ type: "id", value: selected.id }],
    };
    const slot = createSharedSlot({
      id: slotId,
      fragmentId: fragment.id,
      label: input.label ?? selected.label,
    });
    draft.instances.set(fragment.id, fragment);
    draft.instances.set(slot.id, slot);
    parent.children[childIndex] = { type: "id", value: slot.id };
    assertValidSlotPlacement({
      instances: draft.instances,
      props: draft.props,
      instanceSelector: [slot.id, ...input.instanceSelector.slice(1)],
    });
  });
  return createRuntimeMutation({
    payload,
    result: { slotId, fragmentId, instanceId: input.instanceSelector[0] },
    invalidatesNamespaces: ["instances"],
  });
};

const getInstancePathFromInstances = (
  instanceSelector: InstanceSelector,
  instances: Instances
): undefined | InstancePath => {
  const instancePath: InstancePath = [];
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    instancePath.push({
      instance,
      instanceSelector: instanceSelector.slice(index),
    });
  }
  if (instancePath.length === 0) {
    return;
  }
  return instancePath;
};

const findSharedSlotIndex = (instancePath: InstancePath) => {
  return instancePath.findIndex(
    (item, index) =>
      item.instance.component === "Slot" &&
      instancePath[index - 1]?.instance.component === "Fragment"
  );
};

export const getSharedSlotBoundary = (
  instancePath: InstancePath
): undefined | SharedSlotBoundary => {
  const slotIndex = findSharedSlotIndex(instancePath);
  if (slotIndex === -1) {
    return;
  }
  const fragmentItem = instancePath[slotIndex - 1];
  const slotItem = instancePath[slotIndex];
  if (fragmentItem === undefined || slotItem === undefined) {
    return;
  }
  return {
    slotIndex,
    fragmentItem,
    slotItem,
    slotParentItem: instancePath[slotIndex + 1],
    fragmentId: fragmentItem.instance.id,
    slotId: slotItem.instance.id,
    isDirectChild: slotIndex === 2,
  };
};

export const getDirectSharedSlotChildBoundary = (
  instancePath: InstancePath
) => {
  const boundary = getSharedSlotBoundary(instancePath);
  if (boundary?.isDirectChild !== true) {
    return;
  }
  return boundary;
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

export const getSlotFragmentDropTargetMutable = (
  instances: Instances,
  dropTarget: SlotDropTarget,
  createId: () => string,
  excludedFragmentIds: ReadonlySet<Instance["id"]> = new Set()
): SlotDropTarget | undefined => {
  const [parentId] = dropTarget.parentSelector;
  const instance = instances.get(parentId);
  if (instance?.component !== "Slot") {
    return;
  }

  const findReusableFragmentId = (legacyChildren: Instance["children"]) => {
    for (const candidate of instances.values()) {
      if (
        candidate.component !== "Slot" ||
        candidate.children[0]?.type !== "id"
      ) {
        continue;
      }
      const fragment = instances.get(candidate.children[0].value);
      if (
        fragment?.component === "Fragment" &&
        excludedFragmentIds.has(fragment.id) === false &&
        areInstanceChildrenEqual(fragment.children, legacyChildren)
      ) {
        return fragment.id;
      }
    }
  };

  const wrapSlotChildrenWithFragment = () => {
    const legacyChildren = instance.children.map((child) => ({ ...child }));
    const id = findReusableFragmentId(legacyChildren) ?? createId();
    if (instances.has(id) === false) {
      instances.set(id, {
        type: "instance",
        id,
        component: "Fragment",
        children: legacyChildren,
      });
    }
    for (const candidate of instances.values()) {
      if (
        candidate.component === "Slot" &&
        (areInstanceChildrenEqual(candidate.children, legacyChildren) ||
          getSlotFragmentId(candidate) === id)
      ) {
        candidate.children = [{ type: "id", value: id }];
      }
    }
    return {
      parentSelector: [id, ...dropTarget.parentSelector],
      position: dropTarget.position,
    };
  };

  if (instance.children.length === 0) {
    return wrapSlotChildrenWithFragment();
  }
  if (instance.children[0].type === "id") {
    const fragmentId = instance.children[0].value;
    const fragment = instances.get(fragmentId);
    if (fragment?.component !== "Fragment") {
      return wrapSlotChildrenWithFragment();
    }
    return {
      parentSelector: [fragmentId, ...dropTarget.parentSelector],
      position: dropTarget.position,
    };
  }
  return wrapSlotChildrenWithFragment();
};

export const normalizeLegacySlotParentInSelectorMutable = (
  instances: Instances,
  instanceSelector: InstanceSelector,
  createId: () => string
) => {
  const parentSelector = instanceSelector.slice(1);
  const dropTarget = getSlotFragmentDropTargetMutable(
    instances,
    {
      parentSelector,
      position: "end",
    },
    createId
  );
  if (dropTarget === undefined) {
    return instanceSelector;
  }
  return [instanceSelector[0], ...dropTarget.parentSelector];
};

export const normalizeLegacySlotInstancePathMutable = (
  instances: Instances,
  instancePath: InstancePath,
  createId: () => string
) => {
  const normalizedInstanceSelector = normalizeLegacySlotParentInSelectorMutable(
    instances,
    instancePath[0].instanceSelector,
    createId
  );
  return (
    getInstancePathFromInstances(normalizedInstanceSelector, instances) ??
    instancePath
  );
};

export const prepareSlotReparentMutable = ({
  instancePath,
  dropTarget,
}: {
  instancePath: InstancePath;
  dropTarget: SlotDropTarget;
}): { instancePath: InstancePath; dropTarget: SlotDropTarget } => {
  return {
    instancePath,
    dropTarget,
  };
};

const cloneSharedSlotFragmentMutable = ({
  data,
  slotId,
  fragmentId,
  projectId,
  createId,
}: {
  data: Omit<WebstudioData, "pages">;
  slotId: Instance["id"];
  fragmentId: Instance["id"];
  projectId: string;
  createId: () => string;
}) => {
  if (countInstanceChildReferences(data.instances, fragmentId) < 2) {
    return;
  }
  const fragment = extractWebstudioFragment(data, fragmentId);
  const { newInstanceIds } = insertWebstudioFragmentCopy({
    data,
    fragment,
    availableVariables: findAvailableVariables({
      ...data,
      startingInstanceId: slotId,
    }),
    projectId,
    createId,
  });
  const newFragmentId = newInstanceIds.get(fragmentId);
  const slot = data.instances.get(slotId);
  if (slot === undefined || newFragmentId === undefined) {
    return;
  }
  replaceChildReferenceMutable(slot, fragmentId, newFragmentId);
  return newInstanceIds;
};

export const detachSharedSlotChildrenMutable = ({
  data,
  slotId,
  projectId,
  createId,
}: {
  data: Omit<WebstudioData, "pages">;
  slotId: Instance["id"];
  projectId: string;
  createId: () => string;
}) => {
  const slot = data.instances.get(slotId);
  const fragmentId = getSlotFragmentId(slot);
  if (fragmentId === undefined) {
    return;
  }
  cloneSharedSlotFragmentMutable({
    data,
    slotId,
    fragmentId,
    projectId,
    createId,
  });
};

export const detachSharedSlotContentMutable = ({
  data,
  instancePath,
  projectId,
  createId,
}: {
  data: Omit<WebstudioData, "pages">;
  instancePath: InstancePath;
  projectId: string;
  createId: () => string;
}): SharedSlotDetachResult => {
  const boundary = getSharedSlotBoundary(instancePath);
  if (boundary === undefined) {
    return { instancePath };
  }
  const newInstanceIds = cloneSharedSlotFragmentMutable({
    data,
    slotId: boundary.slotId,
    fragmentId: boundary.fragmentId,
    projectId,
    createId,
  });
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
      getInstancePathFromInstances(newInstanceSelector, data.instances) ??
      instancePath,
    newInstanceIds,
    fragmentId: boundary.fragmentId,
    slotId: boundary.slotId,
  };
};
