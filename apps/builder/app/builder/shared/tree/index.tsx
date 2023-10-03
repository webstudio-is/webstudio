import { useCallback } from "react";
import { useStore } from "@nanostores/react";
import {
  Tree,
  TreeItemLabel,
  TreeItemBody,
  type TreeProps,
  type TreeItemRenderProps,
  styled,
  theme,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import {
  editingItemIdStore,
  instancesStore,
  registeredComponentMetasStore,
} from "~/shared/nano-states";
import { MetaIcon } from "../meta-icon";
import { useContentEditable } from "~/shared/dom-hooks";
import { getInstanceLabel } from "~/shared/instance-utils";
import { serverSyncStore } from "~/shared/sync";

export const InstanceTree = (
  props: Omit<
    TreeProps<Instance>,
    "renderItem" | "canLeaveParent" | "getItemChildren" | "editingItemId"
  >
) => {
  const metas = useStore(registeredComponentMetasStore);
  const instances = useStore(instancesStore);
  const editingItemId = useStore(editingItemIdStore);

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

  const updateInstanceLabel = useCallback(
    (instanceId: string, value: string) => {
      serverSyncStore.createTransaction([instancesStore], (instances) => {
        const instance = instances.get(instanceId);
        if (instance === undefined) {
          return;
        }
        instance.label = value;
      });
    },
    []
  );

  const renderItem = useCallback(
    (props: TreeItemRenderProps<Instance>) => {
      const meta = metas.get(props.itemData.component);
      if (meta === undefined) {
        return <></>;
      }
      const label = getInstanceLabel(props.itemData, meta);
      const isEditing = props.itemData.id === editingItemId;

      return (
        <TreeItemBody {...props} selectionEvent="focus">
          <TreeItem
            isEditable={true}
            isEditing={isEditing}
            onChangeValue={(val) => {
              updateInstanceLabel(props.itemData.id, val);
            }}
            onChangeEditing={(isEditing) => {
              editingItemIdStore.set(
                isEditing === true ? props.itemData.id : undefined
              );
            }}
            prefix={<MetaIcon icon={meta.icon} />}
          >
            {label}
          </TreeItem>
        </TreeItemBody>
      );
    },
    [metas, updateInstanceLabel, editingItemId]
  );

  return (
    <Tree
      {...props}
      canLeaveParent={canLeaveParent}
      getItemChildren={getItemChildren}
      renderItem={renderItem}
      editingItemId={editingItemId}
    />
  );
};

const TreeItem = ({
  prefix,
  children,
  isEditing,
  isEditable = false,
  onChangeValue,
  onChangeEditing,
}: {
  isEditable: boolean;
  isEditing: boolean;
  prefix?: React.ReactNode;
  children: React.ReactNode;
  onChangeValue: (value: string) => void;
  onChangeEditing: (isEditing: boolean) => void;
}) => {
  const { ref, handlers } = useContentEditable({
    isEditable,
    isEditing,
    onChangeValue: (value: string) => {
      onChangeValue(value);
      const button = ref.current?.closest(
        "[data-item-button-id]"
      ) as HTMLElement;
      button?.focus();
    },
    onChangeEditing,
  });

  return (
    <EditableTreeItemLabel
      ref={ref}
      {...handlers}
      isEditing={isEditing}
      prefix={prefix}
    >
      {children}
    </EditableTreeItemLabel>
  );
};

const EditableTreeItemLabel = styled(TreeItemLabel, {
  variants: {
    isEditing: {
      true: {
        background: theme.colors.backgroundControls,
        padding: theme.spacing[3],
        borderRadius: theme.spacing[3],
        color: theme.colors.hiContrast,
        outline: "none",
        cursor: "auto",
        textOverflow: "clip",
        userSelect: "auto",
      },
    },
  },
});
