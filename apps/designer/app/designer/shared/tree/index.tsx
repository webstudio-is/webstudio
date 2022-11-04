import {
  Tree,
  TreeItemLabel,
  TreeItemBody,
  TreeNode,
  type TreeNodeProps,
  type TreeProps,
  type TreeItemRenderProps,
} from "@webstudio-is/design-system";
import { components, Instance } from "@webstudio-is/react-sdk";
import {
  findInstanceById,
  getInstancePath,
  getInstancePathWithPositions,
} from "~/shared/tree-utils";

const instanceRelatedProps = {
  findItemById: findInstanceById,
  getItemPath: getInstancePath,
  getItemPathWithPositions: getInstancePathWithPositions,
  canLeaveParent(item: Instance) {
    return components[item.component].isInlineOnly !== true;
  },
  canAcceptChild(item: Instance) {
    return components[item.component].canAcceptChildren;
  },
  getItemChildren(item: Instance) {
    const component = components[item.component];

    // We want to avoid calling .filter() unnecessarily, because this is a hot path for performance.
    // We rely on the fact that only content editable or inline components may have `string` children.
    if (
      component.isContentEditable === false &&
      component.isInlineOnly === false
    ) {
      return item.children as Instance[];
    }

    return item.children.filter(
      (child) => typeof child !== "string"
    ) as Instance[];
  },
  renderItem(props: TreeItemRenderProps<Instance>) {
    const { Icon, label } = components[props.itemData.component];
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
