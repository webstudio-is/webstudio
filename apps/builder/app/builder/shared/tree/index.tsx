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
  getNodeVars,
  rawTheme,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { collectionComponent } from "@webstudio-is/react-sdk";
import {
  $propValuesByInstanceSelector,
  $editingItemSelector,
  getIndexedInstanceId,
  $instances,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { MetaIcon } from "../meta-icon";
import { useContentEditable } from "~/shared/dom-hooks";
import { getInstanceLabel } from "~/shared/instance-utils";
import { serverSyncStore } from "~/shared/sync";
import type { InstanceSelector } from "~/shared/tree-utils";
import { shallowEqual } from "shallow-equal";

export const InstanceTree = (
  props: Omit<
    TreeProps<Instance>,
    "renderItem" | "canLeaveParent" | "getItemChildren" | "editingItemId"
  >
) => {
  const metas = useStore($registeredComponentMetas);
  const instances = useStore($instances);
  const editingItemSelector = useStore($editingItemSelector);
  const propValues = useStore($propValuesByInstanceSelector);

  const canLeaveParent = useCallback(
    ([instanceId]: InstanceSelector) => {
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
    (instanceSelector: InstanceSelector) => {
      const [instanceId, parentId] = instanceSelector;
      let instance = instances.get(instanceId);
      const children: Instance[] = [];

      // put fake collection item instances according to collection data
      if (instance?.component === collectionComponent) {
        const data = propValues
          .get(JSON.stringify(instanceSelector))
          ?.get("data");
        // create items only when collection has content
        if (Array.isArray(data) && instance.children.length > 0) {
          data.forEach((_item, index) => {
            children.push({
              type: "instance",
              id: getIndexedInstanceId(instanceId, index),
              component: "ws:collection-item",
              children: [],
            });
          });
        }
        return children;
      }

      // put parent children as own when parent is a collection
      if (instance === undefined) {
        const parentInstance = instances.get(parentId);
        if (parentInstance?.component === collectionComponent) {
          instance = parentInstance;
        }
      }
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
    [instances, propValues]
  );

  const updateInstanceLabel = useCallback(
    (instanceId: string, value: string) => {
      serverSyncStore.createTransaction([$instances], (instances) => {
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
      const isEditing = shallowEqual(props.itemSelector, editingItemSelector);

      return (
        <TreeItemBody {...props} selectionEvent="focus">
          <TreeItem
            isEditable={true}
            isEditing={isEditing}
            onChangeValue={(val) => {
              updateInstanceLabel(props.itemData.id, val);
            }}
            onChangeEditing={(isEditing) => {
              $editingItemSelector.set(
                isEditing === true ? props.itemSelector : undefined
              );
            }}
            prefix={<MetaIcon icon={meta.icon} />}
          >
            {label}
          </TreeItem>
        </TreeItemBody>
      );
    },
    [metas, updateInstanceLabel, editingItemSelector]
  );

  return (
    <Tree
      {...props}
      canLeaveParent={canLeaveParent}
      getItemChildren={getItemChildren}
      getItemProps={(itemData) => {
        if (itemData.component === "Slot") {
          return {
            style: getNodeVars({ color: rawTheme.colors.foregroundReusable }),
          };
        }
      }}
      renderItem={renderItem}
      editingItemId={editingItemSelector?.[0]}
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
