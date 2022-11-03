import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
import { cssVars } from "@webstudio-is/css-vars";
import { Box } from "../box";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Flex } from "../flex";
import { Text } from "../text";
import { keyframes, styled } from "../../stitches.config";

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
  borderColor: "$slate9",
  variants: {
    isSelected: { true: { borderColor: "$blue7" } },
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
  ml: "-$1",
  pl: "$1",
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
  border: "solid $blue10",
  borderWidth: 2,
  borderRadius: "$2",
  pointerEvents: "none",
  boxSizing: "border-box",
};

const ItemContainer = styled(Flex, {
  color: "$hiContrast",
  alignItems: "center",
  position: "relative",
  ...getItemButtonCssVars({ suffixVisible: false }),
  ...getSuffixContainerCssVars({ suffixVisible: false }),

  variants: {
    isSelected: {
      true: { color: "$loContrast", bc: "$blue10" },
    },
    parentIsSelected: {
      true: { bc: "$blue4" },
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

export type TreeItemRenderProps<Data extends { id: string }> = {
  dropTargetItemId?: string;
  onMouseEnter?: (item: Data) => void;
  onMouseLeave?: (item: Data) => void;
  itemData: Data;
  parentIsSelected?: boolean;
  selectedItemId?: string;
  onSelect?: (itemId: string) => void;
  level: number;
  isAlwaysExpanded: boolean;
  shouldRenderExpandButton: boolean;
  isExpanded: boolean;
};

export const TreeItemBody = <Data extends { id: string }>({
  isAlwaysExpanded,
  selectedItemId,
  onSelect,
  parentIsSelected,
  dropTargetItemId,
  onMouseEnter,
  onMouseLeave,
  itemData,
  level,
  shouldRenderExpandButton,
  isExpanded,
  children,
  suffix,
  suffixWidth = suffix ? "$sizes$5" : "0",
  alwaysShowSuffix = false,
  forceFocus = false,
  selectionTrigger = "click",
}: TreeItemRenderProps<Data> & {
  children: React.ReactNode;
  suffix?: React.ReactNode;
  suffixWidth?: string;
  alwaysShowSuffix?: boolean;
  forceFocus?: boolean;
  selectionTrigger?: "click" | "focus";
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
    return selectionTrigger === "click"
      ? { handleClick: () => onSelect(itemData.id) }
      : { handleFocus: () => onSelect(itemData.id) };
  }, [selectionTrigger, onSelect, itemData.id]);

  const isSelected = itemData.id === selectedItemId;
  const isDragging = dropTargetItemId !== undefined;
  const isDropTarget = dropTargetItemId === itemData.id;

  return (
    <ItemContainer
      onMouseEnter={onMouseEnter && (() => onMouseEnter(itemData))}
      onMouseLeave={onMouseLeave && (() => onMouseLeave(itemData))}
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
    <Text truncate css={{ ml: prefix ? "$1" : 0 }}>
      {children}
    </Text>
  </>
);

export type TreeNodeProps<Data extends { id: string }> = {
  itemData: Data;
  getItemChildren: (item: Data) => Data[];
  renderItem: (props: TreeItemRenderProps<Data>) => React.ReactNode;

  getIsExpanded: (item: Data) => boolean;
  setIsExpanded?: (item: Data, expanded: boolean) => void;
  onExpandTransitionEnd?: () => void;

  selectedItemId?: string;
  parentIsSelected?: boolean;
  onSelect?: (itemId: string) => void;
  onMouseEnter?: (item: Data) => void;
  onMouseLeave?: (item: Data) => void;

  level?: number;
  animate?: boolean;
  dropTargetItemId?: string;

  hideRoot?: boolean;
};

export const TreeNode = <Data extends { id: string }>({
  itemData,
  level = 0,
  parentIsSelected,
  hideRoot,
  ...commonProps
}: TreeNodeProps<Data>) => {
  const {
    getIsExpanded,
    animate = true,
    setIsExpanded,
    selectedItemId,
    onSelect,
    onMouseEnter,
    onMouseLeave,
    onExpandTransitionEnd,
    dropTargetItemId,
    renderItem,
    getItemChildren,
  } = commonProps;

  const collapsibleContentRef = useRef<HTMLDivElement>(null);

  const itemChildren = getItemChildren(itemData);

  const isAlwaysExpanded = level === 0;
  const isExpandable = itemChildren.length > 0;
  const isExpanded = getIsExpanded(itemData) || isAlwaysExpanded;
  const isSelected = itemData.id === selectedItemId;

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
      onOpenChange={(isOpen) => setIsExpanded?.(itemData, isOpen)}
      data-drop-target-id={itemData.id}
    >
      {hideRoot !== true &&
        renderItem({
          dropTargetItemId,
          onMouseEnter,
          onMouseLeave,
          itemData,
          parentIsSelected,
          selectedItemId,
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
                level={hideRoot ? level : level + 1}
                parentIsSelected={isSelected || parentIsSelected}
                {...commonProps}
              />
            ))
          }
        </CollapsibleContent>
      )}
    </Collapsible.Root>
  );
};
