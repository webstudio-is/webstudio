import { useEffect, useRef } from "react";
import { atom, computed } from "nanostores";
import { mergeRefs } from "@react-aria/utils";
import { useStore } from "@nanostores/react";
import {
  Box,
  keyframes,
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
import { showAttribute, getCollectionEntries } from "@webstudio-is/react-sdk";
import {
  ROOT_INSTANCE_ID,
  collectionComponent,
  blockComponent,
  rootComponent,
  blockTemplateComponent,
  descendantComponent,
  type Instance,
} from "@webstudio-is/sdk";
import { animationCanPlayOnCanvasProperty } from "@webstudio-is/sdk/runtime";
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
  $propValuesByInstanceSelectorWithMemoryProps,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { reparentInstance, toggleInstanceShow } from "~/shared/instance-utils";
import { emitCommand } from "~/builder/shared/commands";
import { useContentEditable } from "~/shared/dom-hooks";
import {
  $selectedPage,
  getInstanceKey,
  selectInstance,
} from "~/shared/awareness";
import {
  findClosestContainer,
  isRichTextContent,
  isTreeSatisfyingContentModel,
} from "~/shared/content-model";
import {
  getInstanceLabel,
  InstanceIcon,
} from "~/builder/shared/instance-label";
import { InstanceContextMenu } from "~/builder/shared/instance-context-menu";

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
        const originalData = propValues?.get("data");
        if (originalData && instance.children.length > 0) {
          const entries = getCollectionEntries(originalData);
          if (entries.length > 0) {
            entries.forEach(([key], entryIndex) => {
              for (
                let index = 0;
                index < instance.children.length;
                index += 1
              ) {
                const child = instance.children[index];
                if (child.type === "id") {
                  const isLastChild = index === instance.children.length - 1;
                  const lastDescendentItem = traverse(
                    child.value,
                    [
                      child.value,
                      getIndexedInstanceId(instance.id, key),
                      ...selector,
                    ],
                    visibleAncestors,
                    isHidden,
                    isReusable,
                    isLastChild,
                    instance.children.length * entryIndex + index
                  );
                  if (lastDescendentItem) {
                    lastItem = lastDescendentItem;
                  }
                }
              }
            });
          }
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

const pulse = keyframes({
  "0%": { fillOpacity: 0 },
  "100%": { fillOpacity: 1 },
});

const AnimatedEyeOpenIcon = styled(EyeOpenIcon, {
  "& .ws-eye-open-pupil": {
    transformOrigin: "center",
    animation: `${pulse} 1.5s ease-in-out infinite alternate`,
    fill: "currentColor",
  },
});

const ShowToggle = ({
  instance,
  value,
  isAnimating,
}: {
  instance: Instance;
  value: boolean;
  isAnimating: boolean;
}) => {
  // descendant component is not actually rendered
  // but affects styling of nested elements
  // hiding descendant does not hide nested elements and confuse users
  if (instance.component === descendantComponent) {
    return;
  }
  const toggleShow = () => {
    toggleInstanceShow(instance.id);
  };

  const EyeIcon = isAnimating ? AnimatedEyeOpenIcon : EyeOpenIcon;

  return (
    <Tooltip
      // If you are changing it, change the other one too
      content={
        <Text>
          Removes the instance from the DOM. Breakpoints have no effect on this
          setting.
          {isAnimating && value && (
            <>
              <br />
              <Text css={{ color: theme.colors.foregroundPrimary }}>
                Animation is running on canvas.
              </Text>
            </>
          )}
        </Text>
      }
      disableHoverableContent
      variant="wrapped"
    >
      <SmallIconButton
        css={
          value && isAnimating
            ? {
                color: theme.colors.foregroundPrimary,
                "&:hover": {
                  color: theme.colors.foregroundPrimary,
                  filter: "brightness(80%)",
                },
              }
            : undefined
        }
        tabIndex={-1}
        aria-label="Show"
        onClick={toggleShow}
        icon={value ? <EyeIcon /> : <EyeClosedIcon />}
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
  instance,
  isEditing,
  onIsEditingChange,
}: {
  instance: Instance;
  isEditing: boolean;
  onIsEditingChange: (isEditing: boolean) => void;
}) => {
  const editableRef = useRef<HTMLDivElement | null>(null);

  const label = getInstanceLabel(instance);
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
    <TreeNodeLabel prefix={<InstanceIcon instance={instance} />}>
      <EditableTreeNodeLabel
        ref={mergeRefs(editableRef, ref)}
        {...handlers}
        isEditing={isEditing}
      >
        {label}
      </EditableTreeNodeLabel>
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

  const isContent = isRichTextContent({
    instanceSelector,
    instances: $instances.get(),
    props: $props.get(),
    metas: $registeredComponentMetas.get(),
  });
  if (isContent) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
  }
  return !isContent;
};

const canDrop = (
  dragSelector: InstanceSelector,
  dropTarget: ItemDropTarget
) => {
  const dropSelector = dropTarget.itemSelector;
  const instances = $instances.get();
  const props = $props.get();
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
  const containerSelector = findClosestContainer({
    metas,
    props,
    instances,
    instanceSelector: dropSelector,
  });
  if (dropSelector.length !== containerSelector.length) {
    return false;
  }
  // make sure dragging tree can be put inside of drop instance
  const containerInstanceSelector = [dragSelector[0], ...dropSelector];
  const matches = isTreeSatisfyingContentModel({
    instances,
    metas,
    props,
    instanceSelector: containerInstanceSelector,
  });
  return matches;
};

export const NavigatorTree = () => {
  const isContentMode = useStore($isContentMode);
  const flatTree = useStore($flatTree);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const selectedKey = selectedInstanceSelector?.join();
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const hoveredKey = hoveredInstanceSelector?.join();
  const propValuesByInstanceSelectorWithMemoryProps = useStore(
    $propValuesByInstanceSelectorWithMemoryProps
  );
  const { propsByInstanceId } = useStore($propsIndex);

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
            <TreeNodeLabel
              prefix={<InstanceIcon instance={{ component: rootComponent }} />}
            >
              {rootMeta.label}
            </TreeNodeLabel>
          </TreeNode>
        )}

        {flatTree.map((item) => {
          const level = item.visibleAncestors.length - 1;
          const key = item.selector.join();
          const propValues = propValuesByInstanceSelectorWithMemoryProps.get(
            getInstanceKey(item.selector)
          );
          const show = Boolean(propValues?.get(showAttribute) ?? true);

          // Hook memory prop
          const isAnimationSelected =
            propValues?.get(animationCanPlayOnCanvasProperty) === true;

          const props = propsByInstanceId.get(item.instance.id);
          const actionProp = props?.find(
            (prop) => prop.type === "animationAction"
          );

          const isAnimationPinned = actionProp?.value?.isPinned === true;

          const isAnimating = isAnimationSelected || isAnimationPinned;

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
              <InstanceContextMenu>
                <TreeNode
                  level={level}
                  isSelected={selectedKey === key}
                  isHighlighted={hoveredKey === key || dropTargetKey === key}
                  isExpanded={item.isExpanded}
                  isActionVisible={isAnimating}
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
                  action={
                    <ShowToggle
                      instance={item.instance}
                      value={show}
                      isAnimating={isAnimating}
                    />
                  }
                >
                  <TreeNodeContent
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
              </InstanceContextMenu>
            </TreeSortableItem>
          );
        })}
      </TreeRoot>
      {/* space in the end of scroll area */}
      <Box css={{ height: theme.spacing[9] }}></Box>
    </ScrollArea>
  );
};
