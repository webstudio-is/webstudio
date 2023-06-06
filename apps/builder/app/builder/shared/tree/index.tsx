import { useCallback } from "react";
import { useStore } from "@nanostores/react";
import {
  Tree,
  TreeItemLabel,
  TreeItemBody,
  type TreeProps,
  type TreeItemRenderProps,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import { type WsComponentMeta } from "@webstudio-is/react-sdk";
import {
  instancesStore,
  registeredComponentMetasStore,
} from "~/shared/nano-states";
import { MetaIcon } from "../meta-icon";

export const InstanceTree = (
  props: Omit<
    TreeProps<Instance>,
    "renderItem" | "canLeaveParent" | "getItemChildren"
  >
) => {
  const metas = useStore(registeredComponentMetasStore);
  const instances = useStore(instancesStore);

  const canLeaveParent = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        return false;
      }
      const meta = metas.get(instance.component);
      return meta?.type !== "rich-text-child";
    },
    [instances, metas]
  );

  const getItemChildren = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      const children: Instance[] = [];
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

  const renderItem = useCallback(
    (props: TreeItemRenderProps<Instance>) => {
      const meta = metas.get(props.itemData.component);
      if (meta === undefined) {
        return <></>;
      }
      return (
        <TreeItemBody {...props} selectionEvent="focus">
          <TreeItemLabel prefix={<MetaIcon icon={meta.icon} />}>
            {getInstanceLabel(props.itemData, meta)}
          </TreeItemLabel>
        </TreeItemBody>
      );
    },
    [metas]
  );

  return (
    <Tree
      {...props}
      canLeaveParent={canLeaveParent}
      getItemChildren={getItemChildren}
      renderItem={renderItem}
    />
  );
};

export const getInstanceLabel = (
  instance: { label?: string },
  meta: WsComponentMeta
) => {
  return instance.label || meta.label;
};
