import { useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { atom, computed } from "nanostores";
import { mergeRefs } from "@react-aria/utils";
import { useStore } from "@nanostores/react";
import {
  Box,
  rawTheme,
  ScrollArea,
  SmallIconButton,
  styled,
  Text,
  theme,
  toast,
  Tooltip,
  TreeNode,
  TreeNodeLabel,
  TreeRoot,
  TreeSortableItem,
  type TreeDropTarget,
} from "@webstudio-is/design-system";
import {
  collectionComponent,
  rootComponent,
  showAttribute,
  WsComponentMeta,
} from "@webstudio-is/react-sdk";
import { ROOT_INSTANCE_ID, type Instance } from "@webstudio-is/sdk";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  InfoCircleIcon,
} from "@webstudio-is/icons";
import {
  $dragAndDropState,
  $editableBlockChildOutline,
  $editingItemSelector,
  $hoveredInstanceSelector,
  $instances,
  $isContentMode,
  $props,
  $propsIndex,
  $propValuesByInstanceSelector,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  getIndexedInstanceId,
  type ItemDropTarget,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import { serverSyncStore } from "~/shared/sync";
import { MetaIcon } from "~/builder/shared/meta-icon";
import {
  computeInstancesConstraints,
  findClosestDroppableComponentIndex,
  getInstanceLabel,
  reparentInstance,
} from "~/shared/instance-utils";
import { emitCommand } from "~/builder/shared/commands";
import { useContentEditable } from "~/shared/dom-hooks";
import { $selectedPage, selectInstance } from "~/shared/awareness";

type TreeItem = {
  level: number;
  selector: InstanceSelector;
  instance: Instance;
  isExpanded: undefined | boolean;
  isLastChild: boolean;
  isHidden: boolean;
  isReusable: boolean;
  dropTarget?: TreeDropTarget;
};

const $expandedItems = atom(new Set<string>());

const $dropTarget = computed(
  $dragAndDropState,
  (dragAndDropState) => dragAndDropState.dropTarget
);

const $flatTree = computed(
  [
    $selectedPage,
    $instances,
    $expandedItems,
    $propValuesByInstanceSelector,
    $dropTarget,
  ],
  (
    page,
    instances,
    expandedItems,
    propValuesByInstanceSelector,
    dropTarget
  ) => {
    const flatTree: TreeItem[] = [];
    if (page === undefined) {
      return flatTree;
    }
    const traverse = (
      instanceId: Instance["id"],
      selector: InstanceSelector,
      isParentHidden = false,
      isParentReusable = false,
      isLastChild = false,
      level = 0,
      indexWithinChildren = 0
    ) => {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        // log instead of failing navigator tree
        console.error(`Unknown instance ${instanceId}`);
        return;
      }
      const propValues = propValuesByInstanceSelector.get(
        JSON.stringify(selector)
      );
      const isHidden =
        isParentHidden ||
        false === Boolean(propValues?.get(showAttribute) ?? true);
      const isReusable = isParentReusable || instance.component === "Slot";
      let isExpanded: undefined | boolean;
      if (level > 0 && instance.children.some((child) => child.type === "id")) {
        isExpanded = expandedItems.has(selector.join());
      }
      if (instance.component === "Fragment") {
        isExpanded = true;
      }

      const treeItem: TreeItem = {
        level,
        selector,
        instance,
        isExpanded,
        isLastChild,
        isHidden,
        isReusable,
      };
      let lastItem = treeItem;
      // slot fragment component is not rendered in navigator tree
      // so should be always expanded
      if (instance.component !== "Fragment") {
        flatTree.push(treeItem);
      }

      // render same children for each collection item in data
      if (instance.component === collectionComponent && isExpanded) {
        const data = propValues?.get("data");
        // create items only when collection has content
        if (Array.isArray(data) && instance.children.length > 0) {
          data.forEach((_item, dataIndex) => {
            for (let index = 0; index < instance.children.length; index += 1) {
              const child = instance.children[index];
              if (child.type === "id") {
                const isLastChild = index === instance.children.length - 1;
                const lastDescendentItem = traverse(
                  child.value,
                  [
                    child.value,
                    getIndexedInstanceId(instance.id, dataIndex),
                    ...selector,
                  ],
                  isHidden,
                  isReusable,
                  isLastChild,
                  // virtual item instance is hidden
                  // but level is still increased to show proper drop indicator
                  // and address instance selector
                  level + 2,
                  index
                );
                if (lastDescendentItem) {
                  lastItem = lastDescendentItem;
                }
              }
            }
          });
        }
      } else if (level === 0 || isExpanded) {
        for (let index = 0; index < instance.children.length; index += 1) {
          const child = instance.children[index];
          if (child.type === "id") {
            const isLastChild = index === instance.children.length - 1;
            const lastDescendentItem = traverse(
              child.value,
              [child.value, ...selector],
              isHidden,
              isReusable,
              isLastChild,
              level + 1,
              index
            );
            if (lastDescendentItem) {
              lastItem = lastDescendentItem;
            }
          }
        }
      }

      const parentSelector = treeItem.selector.slice(1);
      if (
        dropTarget &&
        parentSelector.join() === dropTarget.itemSelector.join() &&
        dropTarget.placement.closestChildIndex === indexWithinChildren
      ) {
        if (dropTarget.placement.indexAdjustment === 0) {
          treeItem.dropTarget = {
            parentLevel: level - 1,
            beforeLevel: level,
          };
        } else {
          lastItem.dropTarget = {
            parentLevel: level - 1,
            afterLevel: level,
          };
        }
      }

      return lastItem;
    };
    traverse(page.rootInstanceId, [page.rootInstanceId]);
    return flatTree;
  }
);

const handleExpand = (item: TreeItem, isExpanded: boolean, all: boolean) => {
  const expandedItems = new Set($expandedItems.get());
  const instances = $instances.get();
  const traverse = (instanceId: Instance["id"], selector: InstanceSelector) => {
    const key = selector.join();
    if (isExpanded) {
      expandedItems.add(key);
    } else {
      expandedItems.delete(key);
    }
    const instance = instances.get(instanceId);
    // expand all descendents as well when alt is pressed
    if (all && instance) {
      for (const child of instance.children) {
        traverse(child.value, [child.value, ...selector]);
      }
    }
  };
  traverse(item.instance.id, item.selector);
  $expandedItems.set(expandedItems);
};

const ShowToggle = ({
  instanceId,
  value,
}: {
  instanceId: Instance["id"];
  value: boolean;
}) => {
  const toggleShow = () => {
    const newValue = value === false;
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
          value: newValue,
        };
      }
      if (showProp.type === "boolean") {
        props.set(showProp.id, { ...showProp, value: newValue });
      }
    });
  };
  return (
    <Tooltip
      // If you are changing it, change the other one too
      content="Removes the instance from the DOM. Breakpoints have no effect on this setting."
      disableHoverableContent
      variant="wrapped"
    >
      <SmallIconButton
        tabIndex={-1}
        aria-label="Show"
        onClick={toggleShow}
        icon={value ? <EyeconOpenIcon /> : <EyeconClosedIcon />}
      />
    </Tooltip>
  );
};

const EditableTreeNodeLabel = styled("div", {
  variants: {
    isEditing: {
      true: {
        background: theme.colors.backgroundControls,
        padding: theme.spacing[3],
        borderRadius: theme.spacing[3],
        color: theme.colors.foregroundMain,
        outline: "none",
        cursor: "auto",
        textOverflow: "clip",
        userSelect: "text",
      },
    },
  },
});

const TreeNodeContent = ({
  meta,
  instance,
  isEditing,
  onIsEditingChange,
}: {
  meta: WsComponentMeta;
  instance: Instance;
  isEditing: boolean;
  onIsEditingChange: (isEditing: boolean) => void;
}) => {
  const editableRef = useRef<HTMLDivElement | null>(null);

  const label = getInstanceLabel(instance, meta);
  const { ref, handlers } = useContentEditable({
    value: label,
    isEditable: true,
    isEditing,
    onChangeValue: (value: string) => {
      const instanceId = instance.id;
      serverSyncStore.createTransaction([$instances], (instances) => {
        const instance = instances.get(instanceId);
        if (instance) {
          instance.label = value;
        }
      });
      editableRef.current?.closest("button")?.focus();
    },
    onChangeEditing: onIsEditingChange,
  });

  return (
    <TreeNodeLabel prefix={<MetaIcon icon={meta.icon} />}>
      <EditableTreeNodeLabel
        ref={mergeRefs(editableRef, ref)}
        {...handlers}
        isEditing={isEditing}
      />
    </TreeNodeLabel>
  );
};

const getBuilderDropTarget = (
  selector: string[],
  treeDropTarget: undefined | TreeDropTarget
): undefined | ItemDropTarget => {
  if (treeDropTarget === undefined) {
    return;
  }
  const instances = $instances.get();
  const parentSelector = selector.slice(-treeDropTarget.parentLevel - 1);
  let parentInstance = instances.get(parentSelector[0]);
  const grandParentInstance = instances.get(parentSelector[1]);
  // collection item fake instance
  if (parentInstance === undefined && grandParentInstance) {
    parentInstance = {
      type: "instance",
      id: parentSelector[0],
      component: "Fragment",
      children: grandParentInstance.children,
    };
  }
  if (parentInstance === undefined) {
    return;
  }
  const beforeId =
    treeDropTarget.beforeLevel === undefined
      ? undefined
      : selector.at(-treeDropTarget.beforeLevel - 1);
  const beforeIndex = parentInstance.children.findIndex(
    (child) => child.type === "id" && child.value === beforeId
  );
  const afterId =
    treeDropTarget.afterLevel === undefined
      ? undefined
      : selector.at(-treeDropTarget.afterLevel - 1);
  const afterIndex = parentInstance.children.findIndex(
    (child) => child.type === "id" && child.value === afterId
  );
  let closestChildIndex = 0;
  let indexAdjustment = 0;
  if (beforeIndex > -1) {
    closestChildIndex = beforeIndex;
    indexAdjustment = 0;
  } else if (afterIndex > -1) {
    closestChildIndex = afterIndex;
    indexAdjustment = 1;
  }
  const indexWithinChildren = closestChildIndex + indexAdjustment;
  return {
    itemSelector: parentSelector,
    indexWithinChildren,
    placement: {
      closestChildIndex,
      indexAdjustment,
      childrenOrientation: { type: "vertical", reverse: false },
    },
  };
};

const canDrag = (instance: Instance) => {
  if ($isContentMode.get()) {
    return false;
  }

  const meta = $registeredComponentMetas.get().get(instance.component);
  if (meta === undefined) {
    return true;
  }
  const detachable =
    meta.type !== "rich-text-child" && (meta.detachable ?? true);
  if (detachable === false) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
  }
  return detachable;
};

const canDrop = (
  dragSelector: InstanceSelector,
  dropSelector: InstanceSelector
) => {
  const metas = $registeredComponentMetas.get();
  const instances = $instances.get();
  const insertConstraints = computeInstancesConstraints(metas, instances, [
    dragSelector[0],
  ]);
  const ancestorIndex = findClosestDroppableComponentIndex({
    metas,
    constraints: insertConstraints,
    instances,
    instanceSelector: dropSelector,
  });
  return ancestorIndex === 0;
};

export const NavigatorTree = () => {
  const flatTree = useStore($flatTree);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const selectedKey = selectedInstanceSelector?.join();
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const hoveredKey = hoveredInstanceSelector?.join();
  const propValuesByInstanceSelector = useStore($propValuesByInstanceSelector);
  const metas = useStore($registeredComponentMetas);
  const editingItemSelector = useStore($editingItemSelector);
  const dragAndDropState = useStore($dragAndDropState);
  const dropTargetKey = dragAndDropState.dropTarget?.itemSelector.join();
  const rootMeta = metas.get(rootComponent);

  // expand selected instance ancestors
  useEffect(() => {
    if (selectedInstanceSelector) {
      const newExpandedItems = new Set($expandedItems.get());
      let expanded = 0;
      // do not expand the selected instance itself, start with parent
      for (let index = 1; index < selectedInstanceSelector.length; index += 1) {
        const key = selectedInstanceSelector.slice(index).join();
        if (newExpandedItems.has(key) === false) {
          newExpandedItems.add(key);
          expanded += 1;
        }
      }
      // prevent rerender if nothing new is expanded
      if (expanded > 0) {
        $expandedItems.set(newExpandedItems);
      }
    }
  }, [selectedInstanceSelector]);

  return (
    <ScrollArea
      direction="both"
      css={{
        width: "100%",
        overflow: "hidden",
        flexBasis: 0,
        flexGrow: 1,
      }}
    >
      <TreeRoot>
        {rootMeta && (
          <TreeNode
            level={0}
            isSelected={selectedKey === ROOT_INSTANCE_ID}
            buttonProps={{
              onClick: () => selectInstance([ROOT_INSTANCE_ID]),
              onFocus: () => selectInstance([ROOT_INSTANCE_ID]),
            }}
            action={
              <Tooltip
                variant="wrapped"
                side="bottom"
                disableHoverableContent={true}
                content={
                  <Text>
                    Variables defined on Global Root are available on every
                    instance on every page.
                  </Text>
                }
              >
                <InfoCircleIcon />
              </Tooltip>
            }
          >
            <TreeNodeLabel prefix={<MetaIcon icon={rootMeta.icon} />}>
              {rootMeta.label}
            </TreeNodeLabel>
          </TreeNode>
        )}

        {flatTree.map((item) => {
          const key = item.selector.join();
          const propValues = propValuesByInstanceSelector.get(
            JSON.stringify(item.selector)
          );
          const show = Boolean(propValues?.get(showAttribute) ?? true);
          const meta = metas.get(item.instance.component);
          if (meta === undefined) {
            return;
          }
          return (
            <TreeSortableItem
              key={key}
              level={item.level}
              isExpanded={item.isExpanded}
              isLastChild={item.isLastChild}
              data={item}
              canDrag={() => canDrag(item.instance)}
              dropTarget={item.dropTarget}
              onDropTargetChange={(dropTarget, draggingItem) => {
                const builderDropTarget = getBuilderDropTarget(
                  item.selector,
                  dropTarget
                );
                if (
                  builderDropTarget &&
                  canDrop(draggingItem.selector, builderDropTarget.itemSelector)
                ) {
                  $dragAndDropState.set({
                    ...$dragAndDropState.get(),
                    isDragging: true,
                    dragPayload: {
                      origin: "panel",
                      type: "reparent",
                      dragInstanceSelector: draggingItem.selector,
                    },
                    dropTarget: builderDropTarget,
                  });
                } else {
                  $dragAndDropState.set({
                    ...$dragAndDropState.get(),
                    isDragging: false,
                    dropTarget: undefined,
                  });
                }
              }}
              onDrop={(data) => {
                const builderDropTarget = $dragAndDropState.get().dropTarget;
                if (builderDropTarget) {
                  reparentInstance(data.selector, {
                    parentSelector: builderDropTarget.itemSelector,
                    position: builderDropTarget.indexWithinChildren,
                  });
                }
                $dragAndDropState.set({ isDragging: false });
              }}
              onExpand={(isExpanded) => handleExpand(item, isExpanded, false)}
            >
              <TreeNode
                level={item.level}
                isSelected={selectedKey === key}
                isHighlighted={hoveredKey === key || dropTargetKey === key}
                isExpanded={item.isExpanded}
                onExpand={(isExpanded, all) =>
                  handleExpand(item, isExpanded, all)
                }
                nodeProps={{
                  style: {
                    opacity: item.isHidden ? 0.4 : undefined,
                    color: item.isReusable
                      ? rawTheme.colors.foregroundReusable
                      : undefined,
                  },
                }}
                buttonProps={{
                  onMouseEnter: () => {
                    $hoveredInstanceSelector.set(item.selector);
                    $editableBlockChildOutline.set(undefined);
                  },
                  onMouseLeave: () => $hoveredInstanceSelector.set(undefined),
                  onClick: () => selectInstance(item.selector),
                  onFocus: () => selectInstance(item.selector),
                  onKeyDown: (event) => {
                    if (event.key === "Enter") {
                      emitCommand("editInstanceText");
                    }
                  },
                }}
                action={
                  <ShowToggle instanceId={item.instance.id} value={show} />
                }
              >
                <TreeNodeContent
                  meta={meta}
                  instance={item.instance}
                  isEditing={
                    item.selector.join() === editingItemSelector?.join()
                  }
                  onIsEditingChange={(isEditing) => {
                    $editingItemSelector.set(
                      isEditing === true ? item.selector : undefined
                    );
                  }}
                />
              </TreeNode>
            </TreeSortableItem>
          );
        })}
      </TreeRoot>
      {/* space in the end of scroll area */}
      <Box css={{ height: theme.spacing[9] }}></Box>
    </ScrollArea>
  );
};
