import { useCallback, useRef, useEffect } from "react";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
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
  pr: ITEM_PADDING,
  flexBasis: 0,
  flexGrow: 1,
  position: "relative",
});

const NestingLine = styled(Box, {
  width: Math.ceil(INDENT / 2),
  marginRight: Math.floor(INDENT / 2),
  height: ITEM_HEIGHT,
  borderRight: "solid",
  borderRightWidth: "$1",
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
      {Array.from({ length: level - 1 }, (_, i) => (
        <NestingLine key={i} isSelected={isSelected} />
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

const ItemWrapper = styled(Flex, {
  color: "$hiContrast",
  alignItems: "center",
  position: "relative",
  variants: {
    isSelected: {
      true: { color: "$loContrast", bc: "$blue10" },
    },
    parentIsSelected: {
      true: { bc: "$blue4" },
    },
    enableHoverState: {
      true: { "&:hover:after": hoverStyle },
    },
    forceHoverState: {
      true: { "&:after": hoverStyle },
    },
  },
});

export type TreeNodeProps<Data extends { id: string }> = {
  itemData: Data;
  getItemChildren: (item: Data) => Data[];
  renderItem: (props: { data: Data; isSelected: boolean }) => React.ReactNode;

  getIsExpanded: (item: Data) => boolean;
  setIsExpanded?: (item: Data, expanded: boolean) => void;
  onExpandTransitionEnd?: () => void;

  selectedItemId?: string;
  parentIsSelected?: boolean;
  onSelect?: (itemId: string) => void;

  level?: number;
  animate?: boolean;
  forceHoverStateAtItem?: string;
};

export const TreeNode = <Data extends { id: string }>({
  itemData,
  level = 0,
  parentIsSelected,
  ...commonProps
}: TreeNodeProps<Data>) => {
  const {
    getIsExpanded,
    animate = true,
    setIsExpanded,
    selectedItemId,
    onSelect,
    onExpandTransitionEnd,
    forceHoverStateAtItem,
    renderItem,
    getItemChildren,
  } = commonProps;

  const collapsibleContentRef = useRef<HTMLDivElement>(null);

  const itemChildren = getItemChildren(itemData);

  const isAlwaysExpanded = level === 0;
  const isExpandable = itemChildren.length > 0;
  const isExpanded = getIsExpanded(itemData) || isAlwaysExpanded;
  const isSelected = itemData.id === selectedItemId;

  const makeSelected = () => {
    if (isSelected === false) {
      onSelect?.(itemData.id);
    }
  };

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
      <ItemWrapper
        isSelected={isSelected}
        parentIsSelected={parentIsSelected}
        enableHoverState={forceHoverStateAtItem === undefined}
        forceHoverState={forceHoverStateAtItem === itemData.id}
      >
        {/* We want the main ItemButton to take the entire space,
         * and then position the collapsible trigger on top of it using absolute positionning.
         * When user clicks anywhere on a tree item, they should either hit the main button or the trigger.
         */}

        <ItemButton
          type="button"
          data-drag-item-id={itemData.id}
          data-item-button-id={itemData.id}
          onFocus={makeSelected}
        >
          <NestingLines isSelected={isSelected} level={level} />
          {isAlwaysExpanded === false && <TriggerPlaceholder />}
          {renderItem({ data: itemData, isSelected })}
        </ItemButton>

        {shouldRenderExpandButton && (
          <CollapsibleTrigger
            style={{ left: (level - 1) * INDENT + ITEM_PADDING }}
            // We don't want a separate focusable control inside a tree item.
            // tabIndex makes it skipped over when tabbing.
            // It still can be focused using mouse, but we handle this elsewhere.
            tabIndex={-1}
          >
            {isExpanded ? <TriangleDownIcon /> : <TriangleRightIcon />}
          </CollapsibleTrigger>
        )}
      </ItemWrapper>
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
                level={level + 1}
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

const Label = styled(Text, {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flexBasis: 0,
  flexGrow: 1,

  // With the default lineHeight and overflow:hidden letters like "g" get clipped
  lineHeight: 1.4,

  // For some reason flexBasis:0 is not enough
  // to stop it from growing past the container
  width: 0,

  variants: {
    withIcon: { true: { ml: "$1" } },
  },
});

export const TreeNodeLabel = ({
  text,
  isSelected,
  withIcon = false,
}: {
  text: string;
  isSelected: boolean;
  withIcon?: boolean;
}) => (
  <Label color={isSelected ? "loContrast" : "contrast"} withIcon={withIcon}>
    {text}
  </Label>
);
