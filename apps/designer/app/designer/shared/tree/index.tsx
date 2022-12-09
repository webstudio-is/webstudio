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
    const { type } = getComponentMeta(item.component);
    return type !== "rich-text-child";
  },
  canAcceptChild(item: Instance) {
    const { type } = getComponentMeta(item.component);
    return type === "body" || type === "container";
  },
  getItemChildren(item: Instance) {
    const { type } = getComponentMeta(item.component);

    // We want to avoid calling .filter() unnecessarily, because this is a hot path for performance.
    // We rely on the fact that only rich-text or rich-text-child components may have `string` children.
    if (
      type === "body" ||
      type === "container" ||
      type === "control" ||
      type === "embed"
    ) {
      return item.children as Instance[];
    }

    return item.children.filter(
      (child) => typeof child !== "string"
    ) as Instance[];
  },
  renderItem(props: TreeItemRenderProps<Instance>) {
    const { Icon, label } = getComponentMeta(props.itemData.component);
    return (
      <TreeItemBody {...props} selectionEvent="focus">
        <TreeItemLabel prefix={<Icon />}>{label}</TreeItemLabel>
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
