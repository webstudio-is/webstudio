import {
  collectionComponent,
  elementComponent,
  ROOT_INSTANCE_ID,
  tags,
  type GetInstanceChildren,
  type Instance,
  type Instances,
  type Props,
  type WebstudioFragment,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  createComponentTemplateFragment,
  type ComponentTemplateRegistry,
} from "./component-template";
import {
  findClosestNonTextualContainer,
  isTreeSatisfyingContentModel,
} from "./content-model";
import type { BuilderRuntimeContext } from "./context";
import { getInstancePath } from "./lookup";
import { findClosestInstanceMatchingFragment } from "./matcher";
import type { InstanceSelector } from "./tree";

export type InsertTarget = {
  parentSelector: InstanceSelector;
  position: number | "end" | "after";
};

export type ResolvedInsertTarget = {
  parentInstanceId: Instance["id"];
  parentSelector: InstanceSelector;
  insertIndex?: number;
};

export type ResolvedComponentInsertTarget = ResolvedInsertTarget & {
  tag?: string;
};

type InsertTargetPathItem = {
  instance: Instance;
  instanceSelector: InstanceSelector;
};

export const resolveInsertTargetPosition = ({
  insertTarget,
  instancePath,
  getInstanceChildren,
}: {
  insertTarget: InsertTarget;
  instancePath: InsertTargetPathItem[];
  getInstanceChildren?: GetInstanceChildren;
}): InsertTarget => {
  if (insertTarget.position !== "after") {
    return insertTarget;
  }
  if (instancePath.length === 1) {
    return {
      parentSelector: insertTarget.parentSelector,
      position: "end",
    };
  }
  const [{ instance }, parentItem] = instancePath;
  if (parentItem === undefined) {
    return {
      parentSelector: insertTarget.parentSelector,
      position: "end",
    };
  }
  const index = (
    getInstanceChildren?.(parentItem.instance, parentItem.instanceSelector) ??
    parentItem.instance.children
  ).findIndex((child) => child.type === "id" && child.value === instance.id);
  return {
    parentSelector: parentItem.instanceSelector,
    position: 1 + index,
  };
};

export const getDefaultElementInsertTarget = ({
  instances,
  props,
  metas,
  instanceSelector,
  getInstanceChildren,
}: {
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  instanceSelector: InstanceSelector;
  getInstanceChildren?: GetInstanceChildren;
}): undefined | InsertTarget => {
  const containerSelector = findClosestNonTextualContainer({
    instances,
    props,
    metas,
    instanceSelector,
  });
  const insertableIndex = instanceSelector.length - containerSelector.length;
  if (insertableIndex === 0) {
    return {
      parentSelector: containerSelector,
      position: "end",
    };
  }
  const containerInstance = instances.get(containerSelector[0]);
  if (containerInstance === undefined) {
    return;
  }
  const lastChildInstanceId = instanceSelector[insertableIndex - 1];
  const lastChildPosition = (
    getInstanceChildren?.(containerInstance, containerSelector) ??
    containerInstance.children
  ).findIndex(
    (child) => child.type === "id" && child.value === lastChildInstanceId
  );
  return {
    parentSelector: containerSelector,
    position: lastChildPosition + 1,
  };
};

export const findElementTagForInsertTarget = ({
  instances,
  props,
  metas,
  insertTarget,
}: {
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  insertTarget: InsertTarget;
}) => {
  const element: Instance = {
    type: "instance",
    id: "__candidate_element__",
    component: elementComponent,
    children: [],
  };
  const newInstances = new Map(instances);
  newInstances.set(element.id, element);
  for (const tag of tags) {
    element.tag = tag;
    if (
      isTreeSatisfyingContentModel({
        instances: newInstances,
        props,
        metas,
        instanceSelector: [element.id, ...insertTarget.parentSelector],
      })
    ) {
      return tag;
    }
  }
};

export const findClosestInsertTarget = ({
  fragment,
  instances,
  props,
  metas,
  rootInstanceId,
  selectedInstanceSelector,
  from,
  onRootTarget,
  onNoMatch,
  allowFragmentContentModelWarnings,
  getInstanceChildren,
}: {
  fragment: Pick<WebstudioFragment, "children" | "instances" | "props">;
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  rootInstanceId: Instance["id"];
  selectedInstanceSelector?: InstanceSelector;
  from?: InsertTarget;
  onRootTarget?: () => void;
  onNoMatch?: (message: string) => void;
  allowFragmentContentModelWarnings?: boolean;
  getInstanceChildren?: GetInstanceChildren;
}): undefined | InsertTarget => {
  const instanceSelector = from?.parentSelector ??
    selectedInstanceSelector ?? [rootInstanceId];
  if (instanceSelector[0] === ROOT_INSTANCE_ID) {
    onRootTarget?.();
    return;
  }
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
    onError: onNoMatch,
    allowFragmentContentModelWarnings,
  });
  if (insertableIndex === -1) {
    return;
  }

  insertableIndex += closestContainerIndex;
  const parentSelector = instanceSelector.slice(insertableIndex);
  if (insertableIndex === 0) {
    return from ?? { parentSelector, position: "end" };
  }
  const instance = instances.get(instanceSelector[insertableIndex]);
  if (instance === undefined) {
    return;
  }
  if (instance.component === collectionComponent && insertableIndex === 1) {
    return {
      parentSelector,
      position: "end",
    };
  }
  const lastChildInstanceId = instanceSelector[insertableIndex - 1];
  const lastChildPosition = (
    getInstanceChildren?.(instance, parentSelector) ?? instance.children
  ).findIndex(
    (child) => child.type === "id" && child.value === lastChildInstanceId
  );
  return {
    parentSelector,
    position: lastChildPosition + 1,
  };
};

export const resolveFragmentInsertTarget = ({
  fragment,
  instances,
  props,
  metas,
  rootInstanceId,
  selectedInstanceSelector,
  from,
  onRootTarget,
  onNoMatch,
  onMissingTarget,
  allowFragmentContentModelWarnings,
  getInstanceChildren,
}: {
  fragment: Pick<WebstudioFragment, "children" | "instances" | "props">;
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  rootInstanceId: Instance["id"];
  selectedInstanceSelector?: InstanceSelector;
  from?: InsertTarget;
  onRootTarget?: () => void;
  onNoMatch?: (message: string) => void;
  onMissingTarget?: () => void;
  allowFragmentContentModelWarnings?: boolean;
  getInstanceChildren?: GetInstanceChildren;
}): undefined | ResolvedInsertTarget => {
  const matchedTarget = findClosestInsertTarget({
    fragment,
    instances,
    props,
    metas,
    rootInstanceId,
    selectedInstanceSelector,
    from,
    onRootTarget,
    onNoMatch,
    allowFragmentContentModelWarnings,
    getInstanceChildren,
  });
  const closestTarget =
    matchedTarget ??
    (allowFragmentContentModelWarnings === true ? undefined : from);
  if (closestTarget === undefined) {
    return;
  }
  const instancePath = getInstancePath(closestTarget.parentSelector, instances);
  if (instancePath === undefined) {
    onMissingTarget?.();
    return;
  }
  const { parentSelector, position } = resolveInsertTargetPosition({
    insertTarget: closestTarget,
    instancePath,
    getInstanceChildren,
  });
  const [parentInstanceId] = parentSelector;
  if (
    parentInstanceId === undefined ||
    instances.has(parentInstanceId) === false
  ) {
    onMissingTarget?.();
    return;
  }
  return {
    parentInstanceId,
    parentSelector,
    insertIndex: typeof position === "number" ? position : undefined,
  };
};

export const resolveComponentInsertTarget = ({
  component,
  templates,
  context,
  instances,
  props,
  metas,
  rootInstanceId,
  selectedInstanceSelector,
  from,
  onRootTarget,
  onNoMatch,
  onMissingTarget,
  getInstanceChildren,
}: {
  component: Instance["component"];
  templates: ComponentTemplateRegistry;
  context: Pick<BuilderRuntimeContext, "createId">;
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  rootInstanceId: Instance["id"];
  selectedInstanceSelector?: InstanceSelector;
  from?: InsertTarget;
  onRootTarget?: () => void;
  onNoMatch?: (message: string) => void;
  onMissingTarget?: () => void;
  getInstanceChildren?: GetInstanceChildren;
}): undefined | ResolvedComponentInsertTarget => {
  if (component === elementComponent) {
    const target =
      from ??
      (selectedInstanceSelector === undefined
        ? undefined
        : getDefaultElementInsertTarget({
            instances,
            props,
            metas,
            instanceSelector: selectedInstanceSelector,
            getInstanceChildren,
          }));
    if (target === undefined) {
      return;
    }
    const tag = findElementTagForInsertTarget({
      instances,
      props,
      metas,
      insertTarget: target,
    });
    if (tag === undefined) {
      return;
    }
    const instancePath = getInstancePath(target.parentSelector, instances);
    if (instancePath === undefined) {
      onMissingTarget?.();
      return;
    }
    const { parentSelector, position } = resolveInsertTargetPosition({
      insertTarget: target,
      instancePath,
      getInstanceChildren,
    });
    const [parentInstanceId] = parentSelector;
    if (
      parentInstanceId === undefined ||
      instances.has(parentInstanceId) === false
    ) {
      onMissingTarget?.();
      return;
    }
    return {
      parentInstanceId,
      parentSelector,
      insertIndex: typeof position === "number" ? position : undefined,
      tag,
    };
  }
  const fragment = createComponentTemplateFragment({
    component,
    templates,
    createId: context.createId,
  });
  return resolveFragmentInsertTarget({
    fragment,
    instances,
    props,
    metas,
    rootInstanceId,
    selectedInstanceSelector,
    from,
    onRootTarget,
    onNoMatch,
    onMissingTarget,
    getInstanceChildren,
  });
};
