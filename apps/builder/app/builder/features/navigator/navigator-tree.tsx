import {
  reparentInstance,
  toggleInstanceShow,
} from "~/shared/instance-utils/mutation";
import { useEffect, useMemo, useRef } from "react";
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
import { showAttributeMeta } from "@webstudio-is/project-build/runtime";
import {
  EyeClosedIcon,
  EyeOpenIcon,
  InfoCircleIcon,
} from "@webstudio-is/icons";
import {
  $allSelectedInstanceSelectors,
  $dragAndDropState,
  $blockChildOutline,
  $editingItemSelector,
  $hoveredInstanceSelector,
  $isContentMode,
  $propsIndex,
  $propValuesByInstanceSelector,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedPage,
  clearInstanceSelection,
  getIndexedInstanceId,
  getInstanceKey,
  selectInstance,
  selectInstances,
  type ItemDropTarget,
  $propValuesByInstanceSelectorWithMemoryProps,
} from "~/shared/nano-states";
import {
  getContextMenuSelectedInstanceSelectors,
  getInstanceSelectionUpdate,
} from "~/shared/instance-utils/selection";
import { $instances, $props } from "~/shared/sync/data-stores";
import { suppressCommandsForEvent } from "~/shared/commands-emitter";
import {
  areInstanceSelectorsEqual,
  canDropInstanceSelector,
  isDescendantOrSelf,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";
import { emitCommand } from "~/builder/shared/commands";
import { useContentEditable } from "~/shared/dom-hooks";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { isRichTextContent } from "@webstudio-is/project-build/runtime";
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

function getSelectorKey(selector: InstanceSelector): string;
function getSelectorKey(selector: undefined): undefined;
function getSelectorKey(
  selector: undefined | InstanceSelector
): undefined | string;
function getSelectorKey(selector: undefined | InstanceSelector) {
  return selector === undefined ? undefined : JSON.stringify(selector);
}

const getNavigatorSelectionUpdate = ({
  flatSelectors,
  ...options
}: Omit<
  Parameters<typeof getInstanceSelectionUpdate>[0],
  "orderedSelectors"
> & {
  flatSelectors: InstanceSelector[];
}) =>
  getInstanceSelectionUpdate({
    ...options,
    orderedSelectors: flatSelectors,
  });

const getNavigatorKeyboardSelectionUpdate = ({
  selectedSelectors,
  focusedSelector,
  flatSelectors,
  anchorSelector,
  direction,
}: {
  selectedSelectors: InstanceSelector[];
  focusedSelector: InstanceSelector;
  flatSelectors: InstanceSelector[];
  anchorSelector: undefined | InstanceSelector;
  direction: "previous" | "next";
}) => {
  const focusedIndex = flatSelectors.findIndex((selector) =>
    areInstanceSelectorsEqual(selector, focusedSelector)
  );
  if (focusedIndex === -1) {
    return;
  }
  const nextIndex =
    direction === "previous" ? focusedIndex - 1 : focusedIndex + 1;
  const clickedSelector = flatSelectors[nextIndex];
  if (clickedSelector === undefined) {
    return;
  }
  const nextAnchorSelector = anchorSelector ?? focusedSelector;
  const nextSelection = getInstanceSelectionUpdate({
    selectedSelectors,
    clickedSelector,
    orderedSelectors: flatSelectors,
    anchorSelector: nextAnchorSelector,
    isToggle: false,
    isRange: true,
  });
  return {
    ...nextSelection,
    anchorSelector: nextAnchorSelector,
  };
};

const getNavigatorSiblingSelectionUpdate = ({
  focusedSelector,
  flatSelectors,
}: {
  focusedSelector: InstanceSelector;
  flatSelectors: InstanceSelector[];
}) => {
  const focusedIndex = flatSelectors.findIndex((selector) =>
    areInstanceSelectorsEqual(selector, focusedSelector)
  );
  if (focusedIndex === -1 || focusedSelector.length < 2) {
    return;
  }
  const parentSelector = focusedSelector.slice(1);
  const selectedSelectors = flatSelectors.filter(
    (selector) =>
      selector.length > 1 &&
      areInstanceSelectorsEqual(selector.slice(1), parentSelector)
  );
  return {
    selectedSelectors,
    anchorSelector: focusedSelector,
  };
};

const shouldSelectOnPointerDown = ({
  button,
  metaKey,
  ctrlKey,
  shiftKey,
}: Pick<React.PointerEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey">) =>
  button === 0 && (metaKey || ctrlKey || shiftKey);

const getFocusSelectionSkipCountAfterPointerDown = ({
  button,
}: Pick<React.PointerEvent, "button">) => (button === 2 ? 2 : 1);

const shouldClearNavigatorMultiSelectionOnEscape = ({
  key,
  selectedSelectors,
}: {
  key: string;
  selectedSelectors: InstanceSelector[];
}) => key === "Escape" && selectedSelectors.length > 1;

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
        treeItem.isExpanded = expandedItems.has(getSelectorKey(selector));
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
        areInstanceSelectorsEqual(parentSelector, dropTarget.itemSelector) &&
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
    const key = getSelectorKey(selector);
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
      content={
        <Text>
          {showAttributeMeta.description}
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
      executeRuntimeMutation({
        id: "instances.setLabel",
        input: { instanceId: instance.id, label: value },
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
  if (areInstanceSelectorsEqual($editingItemSelector.get(), instanceSelector)) {
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
    htmlTagsByInstanceId: $propsIndex.get().htmlTagsByInstanceId,
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
  return canDropInstanceSelector({
    dragSelector,
    dropSelector,
    instances: $instances.get(),
    props: $props.get(),
    metas: $registeredComponentMetas.get(),
    htmlTagsByInstanceId: $propsIndex.get().htmlTagsByInstanceId,
    contentMode: $isContentMode.get(),
  });
};

const getNavigatorDragState = ({
  item,
  dropTarget,
  draggingItem,
  canDropTarget,
}: {
  item: TreeItem;
  dropTarget: undefined | TreeDropTarget;
  draggingItem: TreeItem;
  canDropTarget: (
    dragSelector: InstanceSelector,
    dropTarget: ItemDropTarget
  ) => boolean;
}) => {
  const builderDropTarget = getBuilderDropTarget(item, dropTarget);
  if (
    builderDropTarget &&
    canDropTarget(draggingItem.selector, builderDropTarget)
  ) {
    return {
      isDragging: true,
      dragPayload: {
        origin: "panel" as const,
        type: "reparent" as const,
        dragInstanceSelector: draggingItem.selector,
      },
      dropTarget: builderDropTarget,
    };
  }
  return {
    isDragging: false,
    dropTarget: undefined,
  };
};

const commitNavigatorDrop = ({
  item,
  dropTarget,
  reparent,
}: {
  item: TreeItem;
  dropTarget: undefined | ItemDropTarget;
  reparent: typeof reparentInstance;
}) => {
  if (dropTarget === undefined) {
    return false;
  }
  reparent(item.selector, {
    parentSelector: dropTarget.itemSelector,
    position: dropTarget.indexWithinChildren,
  });
  return true;
};

export const NavigatorTree = () => {
  const isContentMode = useStore($isContentMode);
  const flatTree = useStore($flatTree);
  const selectedInstanceSelectors = useStore($allSelectedInstanceSelectors);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const selectedKeys = useMemo(
    () => new Set(selectedInstanceSelectors.map(getSelectorKey)),
    [selectedInstanceSelectors]
  );
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const hoveredKey = getSelectorKey(hoveredInstanceSelector);
  const propValuesByInstanceSelectorWithMemoryProps = useStore(
    $propValuesByInstanceSelectorWithMemoryProps
  );
  const { propsByInstanceId } = useStore($propsIndex);

  const metas = useStore($registeredComponentMetas);
  const editingItemSelector = useStore($editingItemSelector);
  const dragAndDropState = useStore($dragAndDropState);
  const dropTargetKey = getSelectorKey(
    dragAndDropState.dropTarget?.itemSelector
  );
  const rootMeta = metas.get(rootComponent);
  const rangeAnchorSelectorRef = useRef<undefined | InstanceSelector>();
  const suppressFocusSelectionRef = useRef(false);
  const skipFocusSelectionCountRef = useRef(0);
  const skipNextClickSelectionRef = useRef(false);
  const flatSelectors = useMemo(() => {
    const selectors = flatTree.map((item) => item.selector);
    if (rootMeta && isContentMode === false) {
      return [[ROOT_INSTANCE_ID], ...selectors];
    }
    return selectors;
  }, [flatTree, isContentMode, rootMeta]);

  // expand selected instance ancestors
  useEffect(() => {
    if (selectedInstanceSelector) {
      const newExpandedItems = new Set($expandedItems.get());
      let expanded = 0;
      // do not expand the selected instance itself, start with parent
      for (let index = 1; index < selectedInstanceSelector.length; index += 1) {
        const key = getSelectorKey(selectedInstanceSelector.slice(index));
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

  useEffect(() => {
    const anchorSelector = rangeAnchorSelectorRef.current;
    if (anchorSelector === undefined) {
      return;
    }
    if (
      selectedInstanceSelectors.length === 0 ||
      flatSelectors.some((selector) =>
        areInstanceSelectorsEqual(selector, anchorSelector)
      ) === false
    ) {
      rangeAnchorSelectorRef.current = undefined;
    }
  }, [flatSelectors, selectedInstanceSelectors]);

  const clearTextSelection = (
    event: React.MouseEvent | React.FocusEvent | React.PointerEvent
  ) => {
    if (event.currentTarget.querySelector("[contenteditable]") === null) {
      // Allow text selection and edits inside current TreeNode
      // Outside if text is selected, it needs to be unselected before selecting the instance.
      // Otherwise user will cmd+c the text instead of copying the instance.
      window.getSelection()?.removeAllRanges();
    }
  };

  const selectInstanceOnFocus = (
    instanceSelector: undefined | Instance["id"][],
    event: React.MouseEvent | React.FocusEvent
  ) => {
    if (suppressFocusSelectionRef.current) {
      return;
    }
    if (skipFocusSelectionCountRef.current > 0) {
      skipFocusSelectionCountRef.current -= 1;
      return;
    }
    clearTextSelection(event);
    selectInstance(instanceSelector);
    rangeAnchorSelectorRef.current = instanceSelector;
  };

  const selectNavigatorInstance = (
    instanceSelector: InstanceSelector,
    event: React.MouseEvent | React.PointerEvent
  ) => {
    clearTextSelection(event);
    suppressFocusSelectionRef.current = false;
    const nextSelection = getInstanceSelectionUpdate({
      selectedSelectors: selectedInstanceSelectors,
      clickedSelector: instanceSelector,
      orderedSelectors: flatSelectors,
      anchorSelector: rangeAnchorSelectorRef.current,
      isToggle: event.metaKey || event.ctrlKey,
      isRange: event.shiftKey,
    });
    selectInstances(nextSelection.selectedSelectors);
    rangeAnchorSelectorRef.current = nextSelection.anchorSelector;
  };

  const handlePointerDown = (
    instanceSelector: InstanceSelector,
    event: React.PointerEvent
  ) => {
    skipFocusSelectionCountRef.current =
      getFocusSelectionSkipCountAfterPointerDown(event);
    if (shouldSelectOnPointerDown(event)) {
      event.preventDefault();
      event.stopPropagation();
      selectNavigatorInstance(instanceSelector, event);
      skipNextClickSelectionRef.current = true;
      return;
    }
    if (event.button !== 2) {
      return;
    }
    skipNextClickSelectionRef.current = true;
    if (selectedKeys.has(getSelectorKey(instanceSelector))) {
      return;
    }
    clearTextSelection(event);
    suppressFocusSelectionRef.current = false;
    selectInstances(
      getContextMenuSelectedInstanceSelectors({
        selectedSelectors: selectedInstanceSelectors,
        clickedSelector: instanceSelector,
      })
    );
    rangeAnchorSelectorRef.current = instanceSelector;
  };

  const handleClick = (
    instanceSelector: InstanceSelector,
    event: React.MouseEvent
  ) => {
    if (skipNextClickSelectionRef.current) {
      skipNextClickSelectionRef.current = false;
      return;
    }
    selectNavigatorInstance(instanceSelector, event);
  };

  const handleKeyDown = (
    instanceSelector: InstanceSelector,
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (
      shouldClearNavigatorMultiSelectionOnEscape({
        key: event.key,
        selectedSelectors: selectedInstanceSelectors,
      })
    ) {
      suppressCommandsForEvent(event.nativeEvent);
      event.preventDefault();
      event.stopPropagation();
      suppressFocusSelectionRef.current = false;
      clearInstanceSelection();
      rangeAnchorSelectorRef.current = undefined;
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      suppressCommandsForEvent(event.nativeEvent);
      event.preventDefault();
      event.stopPropagation();
      suppressFocusSelectionRef.current = false;
      const nextSelection = getNavigatorSiblingSelectionUpdate({
        focusedSelector: instanceSelector,
        flatSelectors,
      });
      if (nextSelection === undefined) {
        return;
      }
      selectInstances(nextSelection.selectedSelectors);
      rangeAnchorSelectorRef.current = nextSelection.anchorSelector;
      return;
    }

    if (event.shiftKey === false) {
      suppressFocusSelectionRef.current = false;
      return;
    }
    const direction =
      event.key === "ArrowUp"
        ? "previous"
        : event.key === "ArrowDown"
          ? "next"
          : undefined;
    if (direction === undefined) {
      return;
    }
    suppressCommandsForEvent(event.nativeEvent);
    event.preventDefault();
    event.stopPropagation();
    const nextSelection = getNavigatorKeyboardSelectionUpdate({
      selectedSelectors: selectedInstanceSelectors,
      focusedSelector: instanceSelector,
      flatSelectors,
      anchorSelector: rangeAnchorSelectorRef.current,
      direction,
    });
    if (nextSelection === undefined) {
      return;
    }
    suppressFocusSelectionRef.current = true;
    selectInstances(nextSelection.selectedSelectors);
    rangeAnchorSelectorRef.current = nextSelection.anchorSelector;

    const treeButtons = Array.from(
      event.currentTarget
        .closest("[data-navigator-tree]")
        ?.querySelectorAll<HTMLButtonElement>("[data-tree-button]") ?? []
    );
    const buttonIndex = treeButtons.indexOf(event.currentTarget);
    const nextFocusedButton =
      direction === "previous" ? buttonIndex - 1 : buttonIndex + 1;
    if (treeButtons[nextFocusedButton] !== undefined) {
      treeButtons[nextFocusedButton]?.focus({ preventScroll: true });
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Shift" || event.shiftKey === false) {
      suppressFocusSelectionRef.current = false;
    }
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
        <Box data-navigator-tree>
          {rootMeta && isContentMode === false && (
            <TreeNode
              level={0}
              isSelected={selectedKeys.has(getSelectorKey([ROOT_INSTANCE_ID]))}
              buttonProps={{
                onPointerDown: (event) =>
                  handlePointerDown([ROOT_INSTANCE_ID], event),
                onClick: (event) => handleClick([ROOT_INSTANCE_ID], event),
                onKeyDown: (event) => handleKeyDown([ROOT_INSTANCE_ID], event),
                onKeyUp: handleKeyUp,
                onFocus: (event) =>
                  selectInstanceOnFocus([ROOT_INSTANCE_ID], event),
              }}
              action={
                <Tooltip
                  variant="wrapped"
                  side="bottom"
                  disableHoverableContent={true}
                  content={
                    <Text>
                      Variables defined on Global root are available on every
                      instance on every page.
                    </Text>
                  }
                >
                  <InfoCircleIcon />
                </Tooltip>
              }
            >
              <TreeNodeLabel
                prefix={
                  <InstanceIcon instance={{ component: rootComponent }} />
                }
              >
                {rootMeta.label}
              </TreeNodeLabel>
            </TreeNode>
          )}

          {flatTree.map((item) => {
            const level = item.visibleAncestors.length - 1;
            const key = getSelectorKey(item.selector);
            const propValues = propValuesByInstanceSelectorWithMemoryProps.get(
              getInstanceKey(item.selector)
            );
            const show = Boolean(propValues?.get(showAttribute) ?? true);
            const isSelectedDescendantItem =
              selectedInstanceSelector !== undefined &&
              areInstanceSelectorsEqual(
                item.selector,
                selectedInstanceSelector
              ) === false &&
              isDescendantOrSelf(item.selector, selectedInstanceSelector);

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
                  $dragAndDropState.set({
                    ...$dragAndDropState.get(),
                    ...getNavigatorDragState({
                      item,
                      dropTarget,
                      draggingItem,
                      canDropTarget: canDrop,
                    }),
                  });
                }}
                onDrop={(data) => {
                  const builderDropTarget = $dragAndDropState.get().dropTarget;
                  commitNavigatorDrop({
                    item: data,
                    dropTarget: builderDropTarget,
                    reparent: reparentInstance,
                  });
                  $dragAndDropState.set({ isDragging: false });
                }}
                onExpand={(isExpanded) => handleExpand(item, isExpanded, false)}
              >
                <InstanceContextMenu>
                  <TreeNode
                    level={level}
                    isSelected={selectedKeys.has(getSelectorKey(item.selector))}
                    isSelectedDescendant={isSelectedDescendantItem}
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
                      onPointerDown: (event) =>
                        handlePointerDown(item.selector, event),
                      onMouseEnter: () => {
                        $hoveredInstanceSelector.set(item.selector);
                        $blockChildOutline.set(undefined);
                      },
                      onMouseLeave: () =>
                        $hoveredInstanceSelector.set(undefined),
                      onClick: (event) => handleClick(item.selector, event),
                      onFocus: (event) =>
                        selectInstanceOnFocus(item.selector, event),
                      onKeyDown: (event) => {
                        handleKeyDown(item.selector, event);
                        if (event.defaultPrevented) {
                          return;
                        }
                        if (event.key === "Enter") {
                          emitCommand("editInstanceText");
                        }
                      },
                      onKeyUp: handleKeyUp,
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
                      isEditing={areInstanceSelectorsEqual(
                        item.selector,
                        editingItemSelector
                      )}
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
        </Box>
      </TreeRoot>
      {/* space in the end of scroll area */}
      <Box css={{ height: theme.spacing[9] }}></Box>
    </ScrollArea>
  );
};

export const __testing__ = {
  commitNavigatorDrop,
  getFocusSelectionSkipCountAfterPointerDown,
  getBuilderDropTarget,
  getNavigatorDragState,
  getNavigatorKeyboardSelectionUpdate,
  getNavigatorSiblingSelectionUpdate,
  getNavigatorSelectionUpdate,
  shouldClearNavigatorMultiSelectionOnEscape,
  shouldSelectOnPointerDown,
};
