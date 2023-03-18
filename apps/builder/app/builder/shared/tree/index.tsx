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
import type { Instance, InstancesItem } from "@webstudio-is/project-build";
import {
  getComponentMeta,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";
import { instancesStore } from "~/shared/nano-states";
import { createInstancesIndex } from "~/shared/tree-utils";

const instanceRelatedProps = {
  renderItem(props: TreeItemRenderProps<InstancesItem | Instance>) {
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
    TreeProps<InstancesItem>,
    | keyof typeof instanceRelatedProps
    | "canLeaveParent"
    | "canAcceptChild"
    | "getItemChildren"
  >
) => {
  const instances = useStore(instancesStore);

  const canLeaveParent = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        return false;
      }
      const meta = getComponentMeta(instance.component);
      return meta?.type !== "rich-text-child";
    },
    [instances]
  );

  const canAcceptChild = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        return false;
      }
      const meta = getComponentMeta(instance.component);
      return meta?.type === "body" || meta?.type === "container";
    },
    [instances]
  );

  const getItemChildren = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      const children: InstancesItem[] = [];
      if (instance === undefined) {
        return children;
      }

      for (const child of instance.children) {
        if (child.type !== "id") {
          continue;
        }
        const childInstance = instances.get(child.value);
        if (childInstance === undefined) {
          continue;
        }
        children.push(childInstance);
      }
      return children;
    },
    [instances]
  );

  return (
    <Tree
      {...props}
      {...instanceRelatedProps}
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
