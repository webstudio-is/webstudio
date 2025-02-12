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
import { showAttribute } from "@webstudio-is/react-sdk";
import {
  ROOT_INSTANCE_ID,
  collectionComponent,
  blockComponent,
  rootComponent,
  blockTemplateComponent,
  descendantComponent,
  type Instance,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  EyeClosedIcon,
  EyeOpenIcon,
  InfoCircleIcon,
} from "@webstudio-is/icons";
import {
  $dragAndDropState,
  $blockChildOutline,
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
import { getInstanceLabel, reparentInstance } from "~/shared/instance-utils";
import { emitCommand } from "~/builder/shared/commands";
import { useContentEditable } from "~/shared/dom-hooks";
import {
  $selectedPage,
  getInstanceKey,
  selectInstance,
} from "~/shared/awareness";
import { findClosestContainer, isTreeMatching } from "~/shared/matcher";

type TreeItemAncestor =
  | undefined
  | {
      selector: InstanceSelector;
      indexWithinChildren: number;
      component: string;
    };

type TreeItem = {
  selector: InstanceSelector;
  visibleAncestors: TreeItemAncestor[];
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

export const $flatTree = computed(
  [
    $selectedPage,
    $instances,
    $expandedItems,
    $propValuesByInstanceSelector,
    $dropTarget,
    $isContentMode,
  ],
  (
    page,
    instances,
    expandedItems,
    propValuesByInstanceSelector,
    dropTarget,
    isContentMode
  ) => {
    const flatTree: TreeItem[] = [];
    if (page === undefined) {
      return flatTree;
    }
    const traverse = (
      instanceId: Instance["id"],
      selector: InstanceSelector,
      visibleAncestors: TreeItemAncestor[] = [],
      isParentHidden = false,
      isParentReusable = false,
      isLastChild = false,
      indexWithinChildren = 0
    ) => {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        // log instead of failing navigator tree
        console.error(`Unknown instance ${instanceId}`);
        return;
      }
      const propValues = propValuesByInstanceSelector.get(
        getInstanceKey(selector)
      );
      const isHidden =
        isParentHidden ||
        false === Boolean(propValues?.get(showAttribute) ?? true);
      const isReusable = isParentReusable || instance.component === "Slot";
      const treeItem: TreeItem = {
        selector,
        visibleAncestors,
        instance,
        isExpanded: undefined,
        isLastChild,
        isHidden,
        isReusable,
      };
      let isVisible = true;
      // slot fragment component is not rendered in navigator tree
      // so should be always expanded
      if (instance.component === "Fragment") {
        isVisible = false;
      }
      if (isContentMode) {
        // hide everything outside of block instances
        const hasBlockAncestor = visibleAncestors.some(
          (ancestor) => ancestor?.component === blockComponent
        );
        if (
          instance.component !== blockComponent &&
          hasBlockAncestor === false
        ) {
          isVisible = false;
        }
        // though hide block template along with all descendants
        if (instance.component === blockTemplateComponent) {
          return treeItem;
        }
      }
      let lastItem = treeItem;
      if (isVisible) {
        const ancestor = {
          selector,
          indexWithinChildren,
          component: instance.component,
        };
        visibleAncestors = [...visibleAncestors, ancestor];
        treeItem.visibleAncestors = visibleAncestors;
        flatTree.push(treeItem);
      }
      const level = treeItem.visibleAncestors.length - 1;
      if (level > 0 && instance.children.some((child) => child.type === "id")) {
        treeItem.isExpanded = expandedItems.has(selector.join());
      }
      // always expand invisible items
      if (isVisible === false) {
        treeItem.isExpanded = true;
      }

      // render same children for each collection item in data
      if (instance.component === collectionComponent && treeItem.isExpanded) {
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
                  visibleAncestors,
                  isHidden,
                  isReusable,
                  isLastChild,
                  instance.children.length * dataIndex + index
                );
                if (lastDescendentItem) {
                  lastItem = lastDescendentItem;
                }
              }
            }
          });
        }
      } else if (level === 0 || treeItem.isExpanded) {
        for (let index = 0; index < instance.children.length; index += 1) {
          const child = instance.children[index];
          if (child.type === "id") {
            const isLastChild = index === instance.children.length - 1;
            const lastDescendentItem = traverse(
              child.value,
              [child.value, ...selector],
              visibleAncestors,
              isHidden,
              isReusable,
              isLastChild,
              index
            );
            if (lastDescendentItem) {
              lastItem = lastDescendentItem;
            }
          }
        }
      }

      const parentSelector = treeItem.visibleAncestors.at(-2)?.selector;
      if (
        dropTarget &&
        parentSelector?.join() === dropTarget.itemSelector.join() &&
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
    // expand all descendants as well when alt is pressed
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
  instance,
  value,
}: {
  instance: Instance;
  value: boolean;
}) => {
  // descendant component is not actually rendered
  // but affects styling of nested elements
  // hiding descendant does not hide nested elements and confuse users
  if (instance.component === descendantComponent) {
    return;
  }
  const toggleShow = () => {
    const newValue = value === false;
    serverSyncStore.createTransaction([$props], (props) => {
      const { propsByInstanceId } = $propsIndex.get();
      const instanceProps = propsByInstanceId.get(instance.id);
      let showProp = instanceProps?.find((prop) => prop.name === showAttribute);
      if (showProp === undefined) {
        showProp = {
          id: nanoid(),
          instanceId: instance.id,
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
        icon={value ? <EyeOpenIcon /> : <EyeClosedIcon />}
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
  item: TreeItem,
  treeDropTarget: undefined | TreeDropTarget
): undefined | ItemDropTarget => {
  if (treeDropTarget === undefined) {
    return;
  }
  const parentSelector =
    item.visibleAncestors[treeDropTarget.parentLevel]?.selector;
  if (parentSelector === undefined) {
    return;
  }
  const beforeItem = item.visibleAncestors[treeDropTarget.beforeLevel ?? -1];
  const afterItem = item.visibleAncestors[treeDropTarget.afterLevel ?? -1];
  let closestChildIndex = 0;
  let indexAdjustment = 0;
  if (beforeItem) {
    closestChildIndex = beforeItem.indexWithinChildren;
    indexAdjustment = 0;
  } else if (afterItem) {
    closestChildIndex = afterItem.indexWithinChildren;
    indexAdjustment = 1;
  }
  // first position is always reserved for templates in block component
  const instances = $instances.get();
  const parentInstance = instances.get(parentSelector[0]);
  if (parentInstance?.component === blockComponent) {
    // adjust position to show indicator before second child
    // because templates indicator is not rendered in content mode
    if (closestChildIndex === 0) {
      closestChildIndex = 1;
      indexAdjustment = 0;
    }
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

const canDrag = (instance: Instance, instanceSelector: InstanceSelector) => {
  // forbid moving root instance
  if (instanceSelector.length === 1) {
    return false;
  }

  // Do not drag if the instance name is being edited
  if ($editingItemSelector.get()?.join(",") === instanceSelector.join(",")) {
    return false;
  }

  if ($isContentMode.get()) {
    const parentId = instanceSelector[1];
    const parentInstance = $instances.get().get(parentId);
    if (parentInstance === undefined) {
      return false;
    }
    if (parentInstance.component !== blockComponent) {
      return false;
    }
  }
  // prevent moving block template out of first position
  if (instance.component === blockTemplateComponent) {
    return false;
  }

  const meta = $registeredComponentMetas.get().get(instance.component);
  if (meta === undefined) {
    return true;
  }
  const detachable = meta.type !== "rich-text-child";
  if (detachable === false) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
  }
  return detachable;
};

const canDrop = (
  dragSelector: InstanceSelector,
  dropTarget: ItemDropTarget
) => {
  const dropSelector = dropTarget.itemSelector;
  const instances = $instances.get();
  const metas = $registeredComponentMetas.get();
  // in content mode allow drop only within same block
  if ($isContentMode.get()) {
    const parentInstance = instances.get(dropSelector[0]);
    if (parentInstance?.component !== blockComponent) {
      return false;
    }
    // parent of dragging item should be the same as drop target
    if (dropSelector[0] !== dragSelector[1]) {
      return false;
    }
  }
  // prevent dropping into non-container instances
  const closestContainerIndex = findClosestContainer({
    metas,
    instances,
    instanceSelector: dropSelector,
  });
  if (closestContainerIndex !== 0) {
    return false;
  }
  return isTreeMatching({
    instances,
    metas,
    // make sure dragging tree can be put inside of drop instance
    instanceSelector: [
      dragSelector[0],
      ...dropSelector.slice(closestContainerIndex),
    ],
  });
};

export const NavigatorTree = () => {
  const isContentMode = useStore($isContentMode);
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

  const selectInstanceAndClearSelection = (
    instanceSelector: undefined | Instance["id"][],
    event: React.MouseEvent | React.FocusEvent
  ) => {
    if (event.currentTarget.querySelector("[contenteditable]") === null) {
      // Allow text selection and edits inside current TreeNode
      // Outside if text is selected, it needs to be unselected before selecting the instance.
      // Otherwise user will cmd+c the text instead of copying the instance.
      window.getSelection()?.removeAllRanges();
    }

    selectInstance(instanceSelector);
  };

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
        {rootMeta && isContentMode === false && (
          <TreeNode
            level={0}
            isSelected={selectedKey === ROOT_INSTANCE_ID}
            buttonProps={{
              onClick: (event) =>
                selectInstanceAndClearSelection([ROOT_INSTANCE_ID], event),
              onFocus: (event) =>
                selectInstanceAndClearSelection([ROOT_INSTANCE_ID], event),
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
          const level = item.visibleAncestors.length - 1;
          const key = item.selector.join();
          const propValues = propValuesByInstanceSelector.get(
            getInstanceKey(item.selector)
          );
          const show = Boolean(propValues?.get(showAttribute) ?? true);
          const meta = metas.get(item.instance.component);
          if (meta === undefined) {
            return;
          }
          return (
            <TreeSortableItem
              key={key}
              level={level}
              isExpanded={item.isExpanded}
              isLastChild={item.isLastChild}
              data={item}
              canDrag={() => canDrag(item.instance, item.selector)}
              dropTarget={item.dropTarget}
              onDropTargetChange={(dropTarget, draggingItem) => {
                const builderDropTarget = getBuilderDropTarget(
                  item,
                  dropTarget
                );
                if (
                  builderDropTarget &&
                  canDrop(draggingItem.selector, builderDropTarget)
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
                level={level}
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
                    $blockChildOutline.set(undefined);
                  },
                  onMouseLeave: () => $hoveredInstanceSelector.set(undefined),
                  onClick: (event) =>
                    selectInstanceAndClearSelection(item.selector, event),
                  onFocus: (event) =>
                    selectInstanceAndClearSelection(item.selector, event),
                  onKeyDown: (event) => {
                    if (event.key === "Enter") {
                      emitCommand("editInstanceText");
                    }
                  },
                }}
                action={<ShowToggle instance={item.instance} value={show} />}
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
