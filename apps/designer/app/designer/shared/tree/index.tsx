import {
  Tree,
  TreeItemLabel,
  TreeItemBody,
  TreeNode,
  type TreeNodeProps,
  type TreeProps,
  type TreeItemRenderProps,
} from "@webstudio-is/design-system";
import { getComponentMeta, Instance } from "@webstudio-is/react-sdk";
import { utils } from "@webstudio-is/project";

const instanceRelatedProps = {
  findItemById: utils.tree.findInstanceById,
  getItemPath: utils.tree.getInstancePath,
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
  props: Omit<TreeProps<Instance>, keyof typeof instanceRelatedProps>
) => <Tree {...props} {...instanceRelatedProps} />;

export const InstanceTreeNode = (
  props: Omit<TreeNodeProps<Instance>, "getItemChildren" | "renderItem">
) => (
  <TreeNode
    {...props}
    getItemChildren={instanceRelatedProps.getItemChildren}
    renderItem={instanceRelatedProps.renderItem}
  />
);
