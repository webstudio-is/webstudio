import { useCallback, useMemo, useRef } from "react";
import { nanoid } from "nanoid";
import { mergeRefs } from "@react-aria/utils";
import { useStore } from "@nanostores/react";
import { shallowEqual } from "shallow-equal";
import {
  toast,
  Tree,
  TreeItemLabel,
  TreeItemBody,
  type TreeItemRenderProps,
  styled,
  theme,
  getNodeVars,
  rawTheme,
  Tooltip,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { EyeconClosedIcon, EyeconOpenIcon } from "@webstudio-is/icons";
import { collectionComponent, showAttribute } from "@webstudio-is/react-sdk";
import {
  $hoveredInstanceSelector,
  $instances,
  $rootInstance,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  $registeredComponentMetas,
  $dragAndDropState,
  $editingItemSelector,
  $propValuesByInstanceSelector,
  getIndexedInstanceId,
  $props,
  $propsIndex,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import {
  computeInstancesConstraints,
  findClosestDroppableComponentIndex,
  reparentInstance,
  type InsertConstraints,
  isInstanceDetachable,
  getComponentTemplateData,
} from "~/shared/instance-utils";
import { useContentEditable } from "~/shared/dom-hooks";
import { getInstanceLabel } from "~/shared/instance-utils";
import { serverSyncStore } from "~/shared/sync";
import type { Instance } from "@webstudio-is/sdk";
import { MetaIcon } from "./meta-icon";

const TreeItem = ({
  prefix,
  value,
  isEditing,
  isEditable = false,
  onChangeValue,
  onChangeEditing,
}: {
  isEditable: boolean;
  isEditing: boolean;
  prefix?: React.ReactNode;
  value: string;
  onChangeValue: (value: string) => void;
  onChangeEditing: (isEditing: boolean) => void;
}) => {
  const editableRef = useRef<HTMLDivElement | null>(null);
  const { ref, handlers } = useContentEditable({
    value,
    isEditable,
    isEditing,
    onChangeValue: (value: string) => {
      onChangeValue(value);
      const button = editableRef.current?.closest(
        "[data-item-button-id]"
      ) as HTMLElement;
      button?.focus();
    },
    onChangeEditing,
  });

  return (
    <EditableTreeItemLabel
      ref={mergeRefs(editableRef, ref)}
      {...handlers}
      isEditing={isEditing}
      prefix={prefix}
    >
      {value}
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
        userSelect: "text",
      },
    },
  },
});

const ShowToggle = ({
  show,
  onChange,
}: {
  show: boolean;
  onChange: (show: boolean) => void;
}) => {
  return (
    <Tooltip
      // If you are changing it, change the other one too
      content="Removes the instance from the DOM. Breakpoints have no effect on this setting."
      disableHoverableContent
      variant="wrapped"
    >
      <SmallIconButton
        aria-label="Show"
        onClick={() => onChange(show ? false : true)}
        icon={show ? <EyeconOpenIcon /> : <EyeconClosedIcon />}
      />
    </Tooltip>
  );
};

const updateShowProp = (instanceId: Instance["id"], value: boolean) => {
  serverSyncStore.createTransaction([$props], (props) => {
    const { propsByInstanceId } = $propsIndex.get();
    const instanceProps = propsByInstanceId.get(instanceId);
    let showProp = instanceProps?.find((prop) => prop.name === showAttribute);

    if (showProp === undefined) {
      showProp = {
        id: nanoid(),
        instanceId,
        name: showAttribute,
        type: "boolean",
        value,
      };
    }
    if (showProp.type === "boolean") {
      props.set(showProp.id, {
        ...showProp,
        value,
      });
    }
  });
};

const updateInstanceLabel = (instanceId: Instance["id"], value: string) => {
  serverSyncStore.createTransaction([$instances], (instances) => {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    instance.label = value;
  });
};

const canLeaveParent = ([instanceId]: InstanceSelector) => {
  const instance = $instances.get().get(instanceId);
  if (instance === undefined) {
    return false;
  }
  const meta = $registeredComponentMetas.get().get(instance.component);
  return meta?.type !== "rich-text-child";
};

export const NavigatorTree = () => {
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const rootInstance = useStore($rootInstance);
  const instances = useStore($instances);
  const metas = useStore($registeredComponentMetas);
  const state = useStore($dragAndDropState);
  const editingItemSelector = useStore($editingItemSelector);
  const propValues = useStore($propValuesByInstanceSelector);

  const dragPayload = state.dragPayload;

  const dragItemSelector =
    dragPayload?.type === "reparent"
      ? dragPayload.dragInstanceSelector
      : undefined;

  const insertConstraints: undefined | InsertConstraints = useMemo(() => {
    if (dragPayload?.type === "insert") {
      const templateData = getComponentTemplateData(dragPayload.dragComponent);
      if (templateData) {
        const { children, instances } = templateData;
        const newInstances = new Map(
          instances.map((instance) => [instance.id, instance])
        );
        const rootInstanceIds = children
          .filter((child) => child.type === "id")
          .map((child) => child.value);
        return computeInstancesConstraints(
          metas,
          newInstances,
          rootInstanceIds
        );
      }
    }
    if (dragPayload?.type === "reparent") {
      return computeInstancesConstraints(metas, instances, [
        dragPayload.dragInstanceSelector[0],
      ]);
    }
  }, [dragPayload, instances, metas]);

  const findClosestDroppableIndex = useCallback(
    (instanceSelector: InstanceSelector) => {
      if (insertConstraints === undefined) {
        return -1;
      }
      return findClosestDroppableComponentIndex({
        metas,
        constraints: insertConstraints,
        instances,
        instanceSelector,
      });
    },
    [instances, metas, insertConstraints]
  );

  const isItemHidden = useCallback(
    (instanceSelector: InstanceSelector) => {
      const [instanceId, parentInstanceId] = instanceSelector;
      return (
        // fragment is internal component to group other instances
        // for example to support multiple children in slots
        instances.get(instanceId)?.component === "Fragment" ||
        // hide collection items which are temporary generated
        instances.get(parentInstanceId)?.component === collectionComponent
      );
    },
    [instances]
  );

  const handleDragEnd = useCallback(
    (payload: {
      itemSelector: InstanceSelector;
      dropTarget: { itemSelector: InstanceSelector; position: number | "end" };
    }) => {
      reparentInstance(payload.itemSelector, {
        parentSelector: payload.dropTarget.itemSelector,
        position: payload.dropTarget.position,
      });
      $dragAndDropState.set({ isDragging: false });
    },
    []
  );

  const handleSelect = useCallback((instanceSelector: InstanceSelector) => {
    // TreeNode is refocused during "delete" hot key here https://github.com/webstudio-is/webstudio/blob/5935d7818fba3739e4f16fe710ea468bf9d0ac78/packages/design-system/src/components/tree/tree.tsx#L435
    // and then focus cause handleSelect to be called with the same instanceSelector
    // This avoids additional rerender on node delete
    if (shallowEqual($selectedInstanceSelector.get(), instanceSelector)) {
      return;
    }
    $selectedInstanceSelector.set(instanceSelector);
    $textEditingInstanceSelector.set(undefined);
  }, []);

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

  const renderItem = useCallback(
    (props: TreeItemRenderProps<Instance>) => {
      const { itemData, itemSelector } = props;
      const meta = metas.get(itemData.component);
      if (meta === undefined) {
        return <></>;
      }
      const label = getInstanceLabel(itemData, meta);
      const isEditing = shallowEqual(itemSelector, editingItemSelector);
      const instanceProps = propValues.get(JSON.stringify(itemSelector));
      const show = Boolean(instanceProps?.get(showAttribute) ?? true);

      return (
        <TreeItemBody
          {...props}
          selectionEvent="focus"
          suffix={
            <ShowToggle
              show={show}
              onChange={(show) => {
                updateShowProp(itemData.id, show);
              }}
            />
          }
        >
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
            value={label}
          />
        </TreeItemBody>
      );
    },
    [metas, editingItemSelector, propValues]
  );

  if (rootInstance === undefined) {
    return;
  }

  return (
    <Tree
      root={rootInstance}
      selectedItemSelector={selectedInstanceSelector}
      highlightedItemSelector={hoveredInstanceSelector}
      dragItemSelector={dragItemSelector}
      dropTarget={state.dropTarget}
      canLeaveParent={canLeaveParent}
      getItemChildren={getItemChildren}
      getItemProps={({ itemData, itemSelector }) => {
        const props = propValues.get(JSON.stringify(itemSelector));
        const opacity = props?.get(showAttribute) === false ? 0.4 : undefined;
        const color =
          itemData.component === "Slot"
            ? rawTheme.colors.foregroundReusable
            : undefined;
        return {
          style: getNodeVars({ color, opacity }),
        };
      }}
      renderItem={renderItem}
      editingItemId={editingItemSelector?.[0]}
      isItemHidden={isItemHidden}
      findClosestDroppableIndex={findClosestDroppableIndex}
      onSelect={handleSelect}
      onHover={$hoveredInstanceSelector.set}
      onDragItemChange={(dragInstanceSelector) => {
        const instances = $instances.get();
        if (isInstanceDetachable(instances, dragInstanceSelector) === false) {
          toast.error(
            "This instance can not be moved outside of its parent component."
          );
          return;
        }
        $dragAndDropState.set({
          ...$dragAndDropState.get(),
          dragPayload: {
            origin: "panel",
            type: "reparent",
            dragInstanceSelector,
          },
        });
      }}
      onDropTargetChange={(dropTarget) => {
        $dragAndDropState.set({ ...$dragAndDropState.get(), dropTarget });
      }}
      onDragEnd={handleDragEnd}
      onCancel={() => {
        $dragAndDropState.set({ isDragging: false });
      }}
    />
  );
};
