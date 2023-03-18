import { useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
  Tree,
  TreeItemLabel,
  TreeItemBody,
  TreeNode,
  type TreeNodeProps,
  type TreeProps,
  type TreeItemRenderProps,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import {
  getComponentMeta,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";
import { instancesIndexStore } from "~/shared/nano-states";
import {
  createInstancesIndex,
  getInstanceAncestorsAndSelf,
} from "~/shared/tree-utils";

const instanceRelatedProps = {
  renderItem(props: TreeItemRenderProps<Instance>) {
    const meta = getComponentMeta(props.itemData.component);
    if (meta === undefined) {
      return <></>;
    }
    return (
      <TreeItemBody {...props} selectionEvent="focus">
        <TreeItemLabel prefix={<meta.Icon />}>
          {getInstanceLabel(props.itemData, meta)}
        </TreeItemLabel>
      </TreeItemBody>
    );
  },
} as const;

const getInstanceChildren = (instance: undefined | Instance) => {
  if (instance === undefined) {
    return [];
  }
  const meta = getComponentMeta(instance.component);

  // We want to avoid calling .filter() unnecessarily, because this is a hot path for performance.
  // We rely on the fact that only rich-text or rich-text-child components may have `string` children.
  if (
    meta?.type === "body" ||
    meta?.type === "container" ||
    meta?.type === "control" ||
    meta?.type === "embed"
  ) {
    return instance.children as Instance[];
  }

  return instance.children.filter(
    (child): child is Instance => child.type === "instance"
  );
};

export const InstanceTree = (
  props: Omit<
    TreeProps<Instance>,
    | keyof typeof instanceRelatedProps
    | "findItemById"
    | "getItemPath"
    | "canLeaveParent"
    | "canAcceptChild"
    | "getItemChildren"
  >
) => {
  const instancesIndex = useStore(instancesIndexStore);
  const { instancesById } = instancesIndex;

  const findItemById = useCallback(
    (_rootInstance: Instance, instanceId: Instance["id"]) => {
      return instancesById.get(instanceId);
    },
    [instancesById]
  );

  const getItemPath = useCallback(
    (_rootInstance: Instance, instanceId: Instance["id"]) => {
      return getInstanceAncestorsAndSelf(instancesIndex, instanceId);
    },
    [instancesIndex]
  );

  const canLeaveParent = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instancesIndex.instancesById.get(instanceId);
      if (instance === undefined) {
        return false;
      }
      const meta = getComponentMeta(instance.component);
      return meta?.type !== "rich-text-child";
    },
    [instancesIndex]
  );

  const canAcceptChild = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instancesIndex.instancesById.get(instanceId);
      if (instance === undefined) {
        return false;
      }
      const meta = getComponentMeta(instance.component);
      return meta?.type === "body" || meta?.type === "container";
    },
    [instancesIndex]
  );

  const getItemChildren = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instancesIndex.instancesById.get(instanceId);
      return getInstanceChildren(instance);
    },
    [instancesIndex]
  );

  return (
    <Tree
      {...props}
      {...instanceRelatedProps}
      findItemById={findItemById}
      getItemPath={getItemPath}
      canLeaveParent={canLeaveParent}
      canAcceptChild={canAcceptChild}
      getItemChildren={getItemChildren}
    />
  );
};

export const InstanceTreeNode = (
  props: Omit<TreeNodeProps<Instance>, "getItemChildren" | "renderItem">
) => {
  const instancesIndex = useMemo(
    () => createInstancesIndex(props.itemData),
    [props.itemData]
  );
  const getItemChildren = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instancesIndex.instancesById.get(instanceId);
      return getInstanceChildren(instance);
    },
    [instancesIndex]
  );

  return (
    <TreeNode
      {...props}
      getItemChildren={getItemChildren}
      renderItem={instanceRelatedProps.renderItem}
    />
  );
};

export const getInstanceLabel = (
  instance: { label?: string },
  meta: WsComponentMeta
) => {
  return instance.label || meta.label;
};
