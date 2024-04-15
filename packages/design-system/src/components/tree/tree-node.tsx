import {
  useRef,
  useEffect,
  useMemo,
  useState,
  forwardRef,
  type ForwardRefRenderFunction,
  type MouseEvent,
} from "react";
import {
  ChevronFilledDownIcon,
  ChevronFilledRightIcon,
} from "@webstudio-is/icons";
import { Box } from "../box";
import { Flex } from "../flex";
import { Text } from "../text";
import { styled } from "../../stitches.config";
import { theme } from "../../stitches.config";
import {
  type ItemId,
  type ItemSelector,
  areItemSelectorsEqual,
} from "./item-utils";

export const INDENT = 16;
const ITEM_HEIGHT = 32;
const ICONS_SIZE = 16;
const ITEM_PADDING_LEFT = 8;
// extra padding on the right to make sure scrollbar doesn't obscure anything
const ITEM_PADDING_RIGHT = 14;

export const getPlacementIndicatorAlignment = (depth: number) => {
  return depth * INDENT + ITEM_PADDING_LEFT;
};

const suffixWidthVar = `--ws-tree-node-suffix-width`;

const itemButtonVars = {
  paddingRight: `--ws-tree-node-item-button-padding-right`,
};
const getItemButtonCssVars = ({
  suffixVisible,
}: {
  suffixVisible: boolean;
}) => {
  if (suffixVisible) {
    const suffixWidth = `var(${suffixWidthVar}, 0px)`;
    return {
      // We have to use a padding to make space for the suffix
      // because we can't put it inside ItemButton (see comment in TreeItemBody)
      [itemButtonVars.paddingRight]: `calc(${ITEM_PADDING_RIGHT}px + ${suffixWidth})`,
    };
  }
  return {
    [itemButtonVars.paddingRight]: `${ITEM_PADDING_RIGHT}px`,
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
  pl: ITEM_PADDING_LEFT,
  pr: `var(${itemButtonVars.paddingRight})`,
  flexBasis: 0,
  flexGrow: 1,
  position: "relative",
});

const nestingLinesVisibilityVar = "--ws-tree-node-nesting-lines-visibility";

export const showNestingLineVars = () => ({
  [nestingLinesVisibilityVar]: "visible",
});

const NestingLine = styled(Box, {
  visibility: `var(${nestingLinesVisibilityVar}, hidden)`,
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
  ) : undefined;

const CollapsibleTrigger = styled("button", {
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
  opacity: "--ws-tree-node-suffix-opacity",
  pointerEvents: "--ws-tree-node-suffix-pointer-events",
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
  right: `${ITEM_PADDING_RIGHT}px`,
  top: 0,
  bottom: 0,
  defaultVariants: { align: "center" },

  // We use opacity to hide the suffix buttons
  // becuase when `visibility` is used it's impossible to focus the button.
  opacity: `var(${suffixContainerVars.opacity})`,
  pointerEvents: `var(${suffixContainerVars.pointerEvents})`,
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
  elementRef: { current: HTMLElement | null },
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
  }, [
    isSelected,
    //only for the linter
    elementRef,
  ]);
};

export type TreeItemRenderProps<Data extends { id: string }> = {
  onHover?: (itemSelector?: ItemSelector) => void;
  itemData: Data;
  itemSelector: ItemSelector;
  dropTargetItemSelector?: ItemSelector;
  parentIsSelected?: boolean;
  isSelected?: boolean;
  onSelect?: (itemSelector: ItemSelector, all?: boolean) => void;
  level: number;
  isAlwaysExpanded: boolean;
  shouldRenderExpandButton: boolean;
  isExpanded: boolean;
  onToggle: (all: boolean) => void;
};

export const TreeItemBody = <Data extends { id: string }>({
  isAlwaysExpanded,
  onSelect,
  parentIsSelected = false,
  isSelected = false,
  dropTargetItemSelector,
  onHover,
  itemData,
  itemSelector,
  level,
  shouldRenderExpandButton,
  isExpanded,
  children,
  suffix,
  suffixWidth = suffix ? theme.spacing[9] : "0px",
  alwaysShowSuffix = false,
  forceFocus = false,
  selectionEvent = "click",
  onToggle,
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
      ? {
          handleClick: (event: MouseEvent) =>
            onSelect(itemSelector, event.altKey),
        }
      : { handleFocus: () => onSelect(itemSelector) };
  }, [selectionEvent, onSelect, itemSelector]);

  const isDragging = dropTargetItemSelector !== undefined;
  const isDropTarget = areItemSelectorsEqual(
    dropTargetItemSelector,
    itemSelector
  );

  useScrollIntoView(itemButtonRef, {
    isSelected,
    isDragging,
    isDropTarget,
  });

  return (
    <ItemContainer
      onMouseEnter={onHover && (() => onHover(itemSelector))}
      onMouseLeave={onHover && (() => onHover())}
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
          style={{ left: (level - 1) * INDENT + ITEM_PADDING_LEFT }}
          // We don't want this trigger to be focusable
          tabIndex={-1}
          onClick={(event) => onToggle(event.altKey)}
        >
          {isExpanded ? <ChevronFilledDownIcon /> : <ChevronFilledRightIcon />}
        </CollapsibleTrigger>
      )}

      {suffix && (
        <SuffixContainer ref={suffixContainerRef}>{suffix}</SuffixContainer>
      )}
    </ItemContainer>
  );
};

export const TreeItemLabelBase: ForwardRefRenderFunction<
  HTMLDivElement,
  {
    children: React.ReactNode;
    prefix?: React.ReactNode;
  }
> = ({ children, prefix, ...restProps }, ref) => {
  return (
    <>
      {prefix}
      <Text
        ref={ref}
        variant="labelsSentenceCase"
        truncate
        css={{
          ml: prefix ? theme.spacing[3] : 0,
          flexBasis: 0,
          flexGrow: 1,
        }}
        {...restProps}
      >
        {children}
      </Text>
    </>
  );
};

export const TreeItemLabel = forwardRef(TreeItemLabelBase);

export type TreeNodeProps<Data extends { id: ItemId }> = {
  itemData: Data;
  getItemChildren: (itemSelector: ItemSelector) => Data[];
  isItemHidden: (itemSelector: ItemSelector) => boolean;
  renderItem: (props: TreeItemRenderProps<Data>) => React.ReactNode;

  getIsExpanded: (itemSelector: ItemSelector) => boolean;
  setIsExpanded?: (
    itemSelector: ItemSelector,
    value: boolean,
    all?: boolean
  ) => void;

  selectedItemSelector?: ItemSelector;
  dropTargetItemSelector?: ItemSelector;
  parentSelector?: ItemSelector;

  parentIsSelected?: boolean;
  onSelect?: (itemSelector: ItemSelector) => void;
  onHover?: (itemSelector?: ItemSelector) => void;

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
    setIsExpanded,
    selectedItemSelector,
    onSelect,
    onHover,
    dropTargetItemSelector,
    renderItem,
    getItemChildren,
    isItemHidden,
  } = commonProps;

  const itemSelector = [itemData.id, ...(parentSelector ?? [])];

  const itemChildren = getItemChildren(itemSelector);

  const itemIsHidden = isItemHidden(itemSelector);
  // hidden items and root are always expanded
  const isAlwaysExpanded = itemIsHidden || level === 0;

  const isExpandable = itemChildren.length > 0;
  const isExpanded = getIsExpanded(itemSelector) || isAlwaysExpanded;
  const isSelected = areItemSelectorsEqual(itemSelector, selectedItemSelector);

  const shouldRenderExpandButton = isExpandable && isAlwaysExpanded === false;

  return (
    <div data-drop-target-id={itemData.id}>
      {/* optionally prevent rendering root item */}
      {itemIsHidden === false &&
        renderItem({
          dropTargetItemSelector,
          onHover,
          itemData,
          itemSelector,
          parentIsSelected,
          isSelected,
          onSelect,
          level,
          isAlwaysExpanded,
          shouldRenderExpandButton,
          isExpanded,
          onToggle: (all) => {
            setIsExpanded?.(
              itemSelector,
              getIsExpanded(itemSelector) === false,
              all
            );
          },
        })}
      {isExpandable &&
        isExpanded &&
        itemChildren.map((child) => (
          <TreeNode
            key={child.id}
            itemData={child}
            parentSelector={itemSelector}
            parentIsSelected={isSelected || parentIsSelected}
            level={itemIsHidden ? level : level + 1}
            {...commonProps}
          />
        ))}
    </div>
  );
};
