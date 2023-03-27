import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
import { cssVars } from "@webstudio-is/css-vars";
import { Box } from "../box";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Flex } from "../flex";
import { DeprecatedText2 } from "../__DEPRECATED__/text2";
import { keyframes, styled } from "../../stitches.config";
import { theme } from "../../stitches.config";
import {
  type ItemId,
  type ItemSelector,
  areItemSelectorsEqual,
} from "./item-utils";

export const INDENT = 16;
const ITEM_HEIGHT = 32;
const ICONS_SIZE = 15;
const ITEM_PADDING = 8;

export const getPlacementIndicatorAlignment = (depth: number) => {
  return depth * INDENT + ITEM_PADDING;
};

const suffixWidthVar = cssVars.define("suffix-width");

const itemButtonVars = {
  paddingRight: cssVars.define("item-button-padding-right"),
};
const getItemButtonCssVars = ({
  suffixVisible,
}: {
  suffixVisible: boolean;
}) => {
  if (suffixVisible) {
    return {
      // We have to use a padding to make space for the suffix
      // because we can't put it inside ItemButton (see comment in TreeItemBody)
      [itemButtonVars.paddingRight]: `calc(${ITEM_PADDING}px + ${cssVars.use(
        suffixWidthVar,
        "0"
      )})`,
    };
  }
  return {
    [itemButtonVars.paddingRight]: `${ITEM_PADDING}px`,
  };
};
const ItemButton = styled("button", {
  all: "unset",
  display: "flex",
  alignItems: "center",
  boxSizing: "border-box",
  userSelect: "none",
  height: ITEM_HEIGHT,
  minWidth: 0,
  margin: 0,
  pt: 0,
  pb: 0,
  pl: ITEM_PADDING,
  pr: cssVars.use(itemButtonVars.paddingRight),
  flexBasis: 0,
  flexGrow: 1,
  position: "relative",
});

const NestingLine = styled(Box, {
  width: Math.ceil(INDENT / 2),
  marginRight: Math.floor(INDENT / 2),
  height: ITEM_HEIGHT,
  borderRight: "solid",
  borderRightWidth: 1,
  borderColor: theme.colors.slate9,
  variants: {
    isSelected: { true: { borderColor: theme.colors.blue7 } },
  },
});

const NestingLines = ({
  isSelected,
  level,
}: {
  isSelected: boolean;
  level: number;
}) =>
  level > 1 ? (
    <>
      {Array.from({ length: level - 1 }, (_, index) => (
        <NestingLine key={index} isSelected={isSelected} />
      ))}
    </>
  ) : null;

const openKeyframes = keyframes({
  from: { height: 0 },
  to: { height: "var(--radix-collapsible-content-height)" },
});

const closeKeyframes = keyframes({
  from: { height: "var(--radix-collapsible-content-height)" },
  to: { height: 0 },
});

const CollapsibleContentAnimated = styled(Collapsible.Content, {
  overflow: "hidden",
  '&[data-state="open"]': {
    animation: `${openKeyframes} 150ms ease-in-out`,
  },
  '&[data-state="closed"]': {
    animation: `${closeKeyframes} 150ms ease-in-out`,
  },
});

const CollapsibleContentUnanimated = styled(Collapsible.Content, {
  overflow: "hidden",
});

const CollapsibleTrigger = styled(Collapsible.Trigger, {
  all: "unset",
  display: "flex",
  pr: INDENT - ICONS_SIZE,
  height: ITEM_HEIGHT,
  alignItems: "center",
  position: "absolute",

  // We want the button to take extra space so it's easier to hit
  ml: `-${theme.spacing[3]}`,
  pl: theme.spacing[3],
});

const TriggerPlaceholder = styled(Box, { width: INDENT });

const suffixContainerVars = {
  opacity: cssVars.define("suffix-opacity"),
  pointerEvents: cssVars.define("suffix-pointer-events"),
};
const getSuffixContainerCssVars = ({
  suffixVisible,
}: {
  suffixVisible: boolean;
}) => {
  if (suffixVisible) {
    return {
      [suffixContainerVars.opacity]: "1",
      [suffixContainerVars.pointerEvents]: "all",
    };
  }
  return {
    [suffixContainerVars.opacity]: "0",
    [suffixContainerVars.pointerEvents]: "none",
  };
};
const SuffixContainer = styled(Flex, {
  position: "absolute",
  alignItems: "center",
  right: 0,
  top: 0,
  bottom: 0,
  defaultVariants: { align: "center" },

  // We use opacity to hide the suffix buttons
  // becuase when `visibility` is used it's impossible to focus the button.
  opacity: cssVars.use(suffixContainerVars.opacity),
  pointerEvents: cssVars.use(suffixContainerVars.pointerEvents),
});

const hoverStyle = {
  content: "''",
  position: "absolute",
  left: 2,
  right: 2,
  height: ITEM_HEIGHT,
  border: `solid ${theme.colors.blue10}`,
  borderWidth: 2,
  borderRadius: theme.borderRadius[6],
  pointerEvents: "none",
  boxSizing: "border-box",
};

const ItemContainer = styled(Flex, {
  color: theme.colors.hiContrast,
  alignItems: "center",
  position: "relative",
  ...getItemButtonCssVars({ suffixVisible: false }),
  ...getSuffixContainerCssVars({ suffixVisible: false }),

  variants: {
    isSelected: {
      true: { color: theme.colors.loContrast, bc: theme.colors.blue10 },
    },
    parentIsSelected: {
      true: { bc: theme.colors.blue4 },
    },
    suffixVisible: {
      true: {
        ...getItemButtonCssVars({ suffixVisible: true }),
        ...getSuffixContainerCssVars({ suffixVisible: true }),
      },
    },
    enableHoverState: {
      true: {
        "&:hover:after": hoverStyle,

        // Suffix is also visible on hover, which we don't track using JavaScript
        "&:hover": {
          ...getItemButtonCssVars({ suffixVisible: true }),
          ...getSuffixContainerCssVars({ suffixVisible: true }),
        },
      },
    },
    forceHoverState: {
      true: { "&:after": hoverStyle },
    },
  },
});

const useScrollIntoView = (
  element: HTMLElement | null,
  {
    isDragging,
    isDropTarget,
    isSelected,
  }: { isDragging: boolean; isDropTarget: boolean; isSelected: boolean }
) => {
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;
  const isDropTargetRef = useRef(isDropTarget);
  isDropTargetRef.current = isDropTarget;
  const elementRef = useRef(element);
  elementRef.current = element;

  // Scroll the selected button into view when selected from canvas.
  useEffect(() => {
    if (
      isSelected &&
      isDraggingRef.current === false &&
      isDropTargetRef.current === false
    ) {
      elementRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);
};

export type TreeItemRenderProps<Data extends { id: string }> = {
  onMouseEnter?: (itemSelector: ItemSelector) => void;
  onMouseLeave?: (itemSelector: ItemSelector) => void;
  itemData: Data;
  itemSelector: ItemSelector;
  dropTargetItemSelector?: ItemSelector;
  parentIsSelected?: boolean;
  isSelected?: boolean;
  onSelect?: (itemSelector: ItemSelector) => void;
  level: number;
  isAlwaysExpanded: boolean;
  shouldRenderExpandButton: boolean;
  isExpanded: boolean;
};

export const TreeItemBody = <Data extends { id: string }>({
  isAlwaysExpanded,
  onSelect,
  parentIsSelected = false,
  isSelected = false,
  dropTargetItemSelector,
  onMouseEnter,
  onMouseLeave,
  itemData,
  itemSelector,
  level,
  shouldRenderExpandButton,
  isExpanded,
  children,
  suffix,
  suffixWidth = suffix ? theme.spacing[11] : "0",
  alwaysShowSuffix = false,
  forceFocus = false,
  selectionEvent = "click",
}: TreeItemRenderProps<Data> & {
  children: React.ReactNode;
  suffix?: React.ReactNode;
  suffixWidth?: string;
  alwaysShowSuffix?: boolean;
  forceFocus?: boolean;
  selectionEvent?: "click" | "focus";
}) => {
  const [focusTarget, setFocusTarget] = useState<
    "item-button" | "suffix" | undefined
  >();
  const itemButtonRef = useRef<HTMLButtonElement>(null);
  const suffixContainerRef = useRef<HTMLDivElement>(null);
  const updateFocusTarget = () => {
    if (document.activeElement === itemButtonRef.current) {
      setFocusTarget("item-button");
      return;
    }
    if (
      suffixContainerRef.current !== null &&
      suffixContainerRef.current.contains(document.activeElement)
    ) {
      setFocusTarget("suffix");
      return;
    }
    setFocusTarget(undefined);
  };

  const { handleFocus, handleClick } = useMemo(() => {
    if (onSelect === undefined) {
      return {};
    }
    return selectionEvent === "click"
      ? { handleClick: () => onSelect(itemSelector) }
      : { handleFocus: () => onSelect(itemSelector) };
  }, [selectionEvent, onSelect, itemSelector]);

  const isDragging = dropTargetItemSelector !== undefined;
  const isDropTarget = areItemSelectorsEqual(
    dropTargetItemSelector,
    itemSelector
  );

  useScrollIntoView(itemButtonRef.current, {
    isSelected,
    isDragging,
    isDropTarget,
  });

  return (
    <ItemContainer
      onMouseEnter={onMouseEnter && (() => onMouseEnter(itemSelector))}
      onMouseLeave={onMouseLeave && (() => onMouseLeave(itemSelector))}
      isSelected={isSelected}
      parentIsSelected={parentIsSelected}
      enableHoverState={isDragging === false}
      forceHoverState={
        isDropTarget || focusTarget === "item-button" || forceFocus
      }
      suffixVisible={alwaysShowSuffix || focusTarget !== undefined}
      onFocus={updateFocusTarget}
      onBlur={updateFocusTarget}
      css={{ [suffixWidthVar]: suffixWidth }}
    >
      <ItemButton
        type="button"
        data-drag-item-id={itemData.id}
        data-item-button-id={itemData.id}
        onFocus={handleFocus}
        onClick={handleClick}
        ref={itemButtonRef}
      >
        <NestingLines isSelected={isSelected} level={level} />
        {isAlwaysExpanded === false && <TriggerPlaceholder />}
        {children}
      </ItemButton>

      {/* We can't nest the collapsible trigger and suffix inside the ItemButton because 
          <button> can't be nested inside <button>, 
          click events will be mixed up, 
          may hurt accessibility, etc. */}

      {shouldRenderExpandButton && (
        <CollapsibleTrigger
          style={{ left: (level - 1) * INDENT + ITEM_PADDING }}
          // We don't want this trigger to be focusable
          tabIndex={-1}
        >
          {isExpanded ? <TriangleDownIcon /> : <TriangleRightIcon />}
        </CollapsibleTrigger>
      )}

      {suffix && (
        <SuffixContainer ref={suffixContainerRef}>{suffix}</SuffixContainer>
      )}
    </ItemContainer>
  );
};

export const TreeItemLabel = ({
  children,
  prefix,
}: {
  children: React.ReactNode;
  prefix?: React.ReactNode;
}) => (
  <>
    {prefix}
    <DeprecatedText2 truncate css={{ ml: prefix ? theme.spacing[3] : 0 }}>
      {children}
    </DeprecatedText2>
  </>
);

export type TreeNodeProps<Data extends { id: ItemId }> = {
  itemData: Data;
  getItemChildren: (itemId: ItemId) => Data[];
  isItemHidden: (itemId: ItemId) => boolean;
  renderItem: (props: TreeItemRenderProps<Data>) => React.ReactNode;

  getIsExpanded: (itemSelector: ItemSelector) => boolean;
  setIsExpanded?: (itemSelector: ItemSelector, expanded: boolean) => void;
  onExpandTransitionEnd?: () => void;

  selectedItemSelector?: ItemSelector;
  dropTargetItemSelector?: ItemSelector;
  parentSelector?: ItemSelector;

  parentIsSelected?: boolean;
  onSelect?: (itemSelector: ItemSelector) => void;
  onMouseEnter?: (itemSelector: ItemSelector) => void;
  onMouseLeave?: (itemSelector: ItemSelector) => void;

  animate?: boolean;

  level?: number;
};

export const TreeNode = <Data extends { id: string }>({
  itemData,
  parentSelector,
  parentIsSelected,
  level = 0,
  ...commonProps
}: TreeNodeProps<Data>) => {
  const {
    getIsExpanded,
    animate = true,
    setIsExpanded,
    selectedItemSelector,
    onSelect,
    onMouseEnter,
    onMouseLeave,
    onExpandTransitionEnd,
    dropTargetItemSelector,
    renderItem,
    getItemChildren,
    isItemHidden,
  } = commonProps;

  const collapsibleContentRef = useRef<HTMLDivElement>(null);

  const itemChildren = getItemChildren(itemData.id);

  const itemSelector = [itemData.id, ...(parentSelector ?? [])];

  const itemIsHidden = isItemHidden(itemData.id);
  const isAlwaysExpanded = itemIsHidden;
  if (itemIsHidden === false) {
    level += 1;
  }

  const isExpandable = itemChildren.length > 0;
  const isExpanded = getIsExpanded(itemSelector) || isAlwaysExpanded;
  const isSelected = areItemSelectorsEqual(itemSelector, selectedItemSelector);

  const shouldRenderExpandButton = isExpandable && isAlwaysExpanded === false;

  const CollapsibleContent = animate
    ? CollapsibleContentAnimated
    : CollapsibleContentUnanimated;

  const handleAnimationEnd = useCallback(
    (event: React.AnimationEvent<HTMLDivElement>) => {
      if (event.target === collapsibleContentRef.current) {
        onExpandTransitionEnd?.();
      }
    },
    [onExpandTransitionEnd]
  );

  // If ther's no animation, we need to manually trigger onExpandTransitionEnd
  const prevIsExpanded = useRef(isExpanded);
  useEffect(() => {
    if (animate === false && isExpanded !== prevIsExpanded.current) {
      onExpandTransitionEnd?.();
    }
    prevIsExpanded.current = isExpanded;
  }, [animate, onExpandTransitionEnd, isExpanded]);

  return (
    <Collapsible.Root
      open={isExpanded}
      onOpenChange={(isOpen) => setIsExpanded?.(itemSelector, isOpen)}
      data-drop-target-id={itemData.id}
    >
      {/* optionally prevent rendering root item */}
      {itemIsHidden === false &&
        renderItem({
          dropTargetItemSelector,
          onMouseEnter,
          onMouseLeave,
          itemData,
          itemSelector,
          parentIsSelected,
          isSelected,
          onSelect,
          level,
          isAlwaysExpanded,
          shouldRenderExpandButton,
          isExpanded,
        })}
      {isExpandable && (
        <CollapsibleContent
          onAnimationEnd={handleAnimationEnd}
          ref={collapsibleContentRef}
        >
          {
            // CollapsibleContent doesn't render children when collapsed.
            // No need to worry about optimizing this.
            itemChildren.map((child) => (
              <TreeNode
                key={child.id}
                itemData={child}
                parentSelector={itemSelector}
                parentIsSelected={isSelected || parentIsSelected}
                level={level}
                {...commonProps}
              />
            ))
          }
        </CollapsibleContent>
      )}
    </Collapsible.Root>
  );
};
