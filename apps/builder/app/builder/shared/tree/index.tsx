import { useCallback } from "react";
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
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { utils } from "@webstudio-is/project";
import { instancesIndexStore } from "~/shared/nano-states";
import { getInstanceAncestorsAndSelf } from "~/shared/tree-utils";

const instanceRelatedProps = {
  getItemPathWithPositions: utils.tree.getInstancePathWithPositions,
  canLeaveParent(item: Instance) {
    const meta = getComponentMeta(item.component);
    return meta?.type !== "rich-text-child";
  },
  canAcceptChild(item: Instance) {
    const meta = getComponentMeta(item.component);
    return meta?.type === "body" || meta?.type === "container";
  },
  getItemChildren(item: Instance) {
    const meta = getComponentMeta(item.component);

    // We want to avoid calling .filter() unnecessarily, because this is a hot path for performance.
    // We rely on the fact that only rich-text or rich-text-child components may have `string` children.
    if (
      meta?.type === "body" ||
      meta?.type === "container" ||
      meta?.type === "control" ||
      meta?.type === "embed"
    ) {
      return item.children as Instance[];
    }

    return item.children.filter(
      (child): child is Instance => child.type === "instance"
    );
  },
  renderItem(props: TreeItemRenderProps<Instance>) {
    const meta = getComponentMeta(props.itemData.component);
    if (meta === undefined) {
      return <></>;
    }
    return (
      <TreeItemBody {...props} selectionEvent="focus">
        <TreeItemLabel prefix={<meta.Icon />}>{meta.label}</TreeItemLabel>
      </TreeItemBody>
    );
  },
} as const;

export const InstanceTree = (
  props: Omit<
    TreeProps<Instance>,
    keyof typeof instanceRelatedProps | "findItemById" | "getItemPath"
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

  return (
    <Tree
      {...props}
      {...instanceRelatedProps}
      findItemById={findItemById}
      getItemPath={getItemPath}
    />
  );
};

export const InstanceTreeNode = (
  props: Omit<TreeNodeProps<Instance>, "getItemChildren" | "renderItem">
) => (
  <TreeNode
    {...props}
    getItemChildren={instanceRelatedProps.getItemChildren}
    renderItem={instanceRelatedProps.renderItem}
  />
);
