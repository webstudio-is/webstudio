import {
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FocusScope, useFocusManager } from "@react-aria/focus";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { disableNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview";
import {
  attachInstruction,
  extractInstruction,
  type Instruction,
  type ItemMode,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import { autoScrollWindowForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { ChevronDownIcon, ChevronRightIcon } from "@webstudio-is/icons";
import { styled, theme } from "../stitches.config";
import { Box } from "./box";
import { Text } from "./text";
import { TreePositionIndicator } from "./list-position-indicator";

const treeNodeLevel = "--tree-node-level";
const treeNodeOutline = "--tree-node-outline";
const treeNodeBackgroundColor = "--tree-node-background-color";
const treeActionOpacity = "--tree-action-opacity";
const treeDepthBarsVisibility = "--tree-depth-bars-visibility";
const treeDepthBarsColor = "--tree-depth-bars-color";

const ITEM_PADDING_LEFT = 8;
// extra padding on the right to make sure scrollbar doesn't obscure anything
const ITEM_PADDING_RIGHT = 10;
const BARS_GAP = 16;
const EXPAND_WIDTH = 24;

const TreeContainer = ({ children }: { children: ReactNode }) => {
  const focusManager = useFocusManager();
  return (
    <Box
      css={{
        "&:hover": {
          [treeDepthBarsVisibility]: "visible",
        },
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          focusManager?.focusPrevious({
            accept: (node) => node.hasAttribute("data-tree-button"),
          });
          // prevent scrolling
          event.preventDefault();
        }
        if (event.key === "ArrowDown") {
          focusManager?.focusNext({
            accept: (node) => node.hasAttribute("data-tree-button"),
          });
          // prevent scrolling
          event.preventDefault();
        }
        if (event.key === "ArrowRight") {
          focusManager?.focusNext({
            accept: (node) =>
              node.hasAttribute("data-tree-button") ||
              // try to focus button inside action
              node.closest("[data-tree-action]") !== null,
          });
          // prevent scrolling
          event.preventDefault();
        }
      }}
    >
      {children}
    </Box>
  );
};

export const TreeRoot = ({ children }: { children: ReactNode }) => {
  return (
    <FocusScope>
      <TreeContainer>{children}</TreeContainer>
    </FocusScope>
  );
};

const NodeContainer = styled("div", {
  position: "relative",
  height: theme.sizes.controlHeight,
  "&:hover, &:has(:focus-visible), &:has([aria-current=true])": {
    [treeNodeBackgroundColor]: theme.colors.backgroundHover,
    backgroundColor: `var(${treeNodeBackgroundColor})`,
    [treeActionOpacity]: 1,
  },
  "&:has([aria-selected=true])": {
    [treeNodeBackgroundColor]: theme.colors.backgroundItemCurrent,
    backgroundColor: `var(${treeNodeBackgroundColor})`,
    [treeDepthBarsColor]: theme.colors.borderItemChildLineCurrent,
  },
});

const DepthBars = styled("div", {
  visibility: `var(${treeDepthBarsVisibility}, hidden)`,
  position: "absolute",
  top: 0,
  left: 0,
  width: `calc((var(${treeNodeLevel}) - 1) * ${BARS_GAP}px)`,
  height: "100%",
  backgroundImage: `repeating-linear-gradient(
    to right,
    transparent,
    transparent ${BARS_GAP - 1}px,
    var(${treeDepthBarsColor}, ${theme.colors.borderItemChildLine}) ${BARS_GAP - 1}px,
    var(${treeDepthBarsColor}, ${theme.colors.borderItemChildLine}) ${BARS_GAP}px
  )`,
});

const NodeButton = styled("button", {
  all: "unset",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  userSelect: "none",
  width: "100%",
  height: "inherit",
  minWidth: 0,
  paddingLeft: `calc(${ITEM_PADDING_LEFT}px + var(${treeNodeLevel}) * 16px)`,
  paddingRight: ITEM_PADDING_RIGHT,
  flexBasis: 0,
  flexGrow: 1,
  position: "relative",
});

const ExpandButton = styled("button", {
  all: "unset",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "absolute",
  top: 0,
  left: `calc(var(${treeNodeLevel}) * ${BARS_GAP}px - ${EXPAND_WIDTH / 2}px)`,
  width: EXPAND_WIDTH,
  height: "inherit",
});

const ActionContainer = styled("div", {
  // use opacity to hide action instead of visibility
  // to prevent focus loss while navigating with keyboard
  opacity: `var(${treeActionOpacity}, 0)`,
  position: "sticky",
  translate: `calc(${theme.sizes.sidebarWidth} - 100%) -100%`,
  paddingLeft: ITEM_PADDING_LEFT,
  paddingRight: ITEM_PADDING_RIGHT,
  left: 0,
  height: "inherit",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: `var(${treeNodeBackgroundColor})`,
});

const DropIndicator = ({
  instruction,
}: {
  instruction: undefined | Instruction;
}) => {
  if (instruction?.type === "reorder-above") {
    const indent = instruction.currentLevel * instruction.indentPerLevel;
    return (
      <TreePositionIndicator
        x={indent}
        y="0"
        length={`calc(100% - ${indent}px)`}
      />
    );
  }
  if (instruction?.type === "reorder-below") {
    const indent = instruction.currentLevel * instruction.indentPerLevel;
    return (
      <TreePositionIndicator
        x={indent}
        y="100%"
        length={`calc(100% - ${indent}px)`}
      />
    );
  }
  if (instruction?.type === "reparent") {
    const indent = instruction.desiredLevel * instruction.indentPerLevel;
    return (
      <TreePositionIndicator
        x={indent}
        y="100%"
        length={`calc(100% - ${indent}px)`}
      />
    );
  }
};

export type TreeDropTarget = {
  parentLevel: number;
  beforeLevel?: number;
  afterLevel?: number;
};

const getTreeDropTarget = (
  instruction: null | Instruction
): undefined | TreeDropTarget => {
  if (instruction?.type === "make-child") {
    const afterLevel = instruction.currentLevel + 1;
    return { parentLevel: afterLevel - 1, afterLevel };
  }
  if (instruction?.type === "reorder-below") {
    const afterLevel = instruction.currentLevel;
    return { parentLevel: afterLevel - 1, afterLevel };
  }
  if (instruction?.type === "reorder-above") {
    const beforeLevel = instruction.currentLevel;
    return { parentLevel: beforeLevel - 1, beforeLevel };
  }
  if (instruction?.type === "reparent") {
    const afterLevel = instruction.desiredLevel;
    return { parentLevel: afterLevel - 1, afterLevel };
  }
};

const getInstruction = (
  treeDropTarget: undefined | TreeDropTarget
): undefined | Instruction => {
  if (treeDropTarget?.beforeLevel !== undefined) {
    return {
      type: "reorder-above",
      currentLevel: treeDropTarget.beforeLevel,
      indentPerLevel: BARS_GAP,
    };
  }
  if (treeDropTarget?.afterLevel !== undefined) {
    return {
      type: "reorder-below",
      currentLevel: treeDropTarget.afterLevel,
      indentPerLevel: BARS_GAP,
    };
  }
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const useCallbackRef = <Fn extends Function>(fn: Fn) => {
  const ref = useRef(fn);
  useInsertionEffect(() => {
    ref.current = fn;
  });
  return ref;
};

export const TreeSortableItem = <Data,>({
  level,
  isExpanded,
  isLastChild,
  data,
  canDrag,
  dropTarget,
  onDropTargetChange,
  onDrop,
  onExpand,
  children,
}: {
  level: number;
  isExpanded: undefined | boolean;
  isLastChild: boolean;
  data: Data;
  canDrag: () => boolean;
  dropTarget: undefined | TreeDropTarget;
  onDropTargetChange: (
    dropTarget: undefined | TreeDropTarget,
    draggingData: Data
  ) => void;
  onDrop: (data: Data) => void;
  onExpand: (isExpanded: boolean) => void;
  children: ReactNode;
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropOver, setIsDropOver] = useState(false);
  const handleDropTargetChange = useCallbackRef(onDropTargetChange);
  const handleDrop = useCallbackRef(onDrop);
  const handleExpand = useCallbackRef(onExpand);
  const handleCanDrag = useCallbackRef(canDrag);
  const expandTimeout = useRef<undefined | number>(undefined);

  useEffect(() => {
    if (elementRef.current === null) {
      return;
    }
    return combine(
      draggable({
        element: elementRef.current,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          disableNativeDragPreview({ nativeSetDragImage });
        },
        getInitialData: () => ({
          itemData: data,
        }),
        canDrag: () => handleCanDrag.current(),
        onDrag: () => {
          setIsDragging(true);
        },
        onDrop: () => {
          setIsDragging(false);
        },
      }),
      dropTargetForElements({
        element: elementRef.current,
        getData: ({ input, element }) => {
          // this will 'attach' the instruction to your `data` object
          let mode: ItemMode = "standard";
          if (isLastChild) {
            mode = "last-in-group";
          }
          if (isExpanded) {
            mode = "expanded";
          }
          return attachInstruction(
            {},
            {
              input,
              element,
              currentLevel: level,
              indentPerLevel: BARS_GAP,
              mode,
            }
          );
        },
        onDrag: (args) => {
          const instruction = extractInstruction(args.self.data);
          const dropTarget = getTreeDropTarget(instruction);
          const draggingData = args.source.data.itemData as Data;
          if (dropTarget) {
            handleDropTargetChange.current(dropTarget, draggingData);
          }
        },
        onDragEnter: () => {
          // timeout in browser use only number as timeout id
          window.clearTimeout(expandTimeout.current);
          expandTimeout.current = window.setTimeout(() => {
            handleExpand.current(true);
          }, 600);
          setIsDropOver(true);
        },
        onDragLeave: (args) => {
          window.clearTimeout(expandTimeout.current);
          setIsDropOver(false);
          const draggingData = args.source.data.itemData as Data;
          handleDropTargetChange.current(undefined, draggingData);
        },
        onDrop: (args) => {
          const draggingData = args.source.data.itemData as Data;
          window.clearTimeout(expandTimeout.current);
          handleDrop.current(draggingData);
          setIsDropOver(false);
        },
      }),
      autoScrollWindowForElements()
    );
  }, [
    level,
    isExpanded,
    isLastChild,
    data,
    handleCanDrag,
    handleDrop,
    handleDropTargetChange,
    handleExpand,
  ]);

  return (
    <Box
      ref={elementRef}
      data-tree-sortable-item
      data-level={level}
      data-is-dragging={isDragging}
      data-is-drop-over={isDropOver}
      css={{
        position: "relative",
        "&[data-is-drop-over=true]": {
          zIndex: 1,
        },
        "&[data-is-dragging=true]": {
          [treeNodeOutline]: "none",
        },
      }}
    >
      {children}
      <DropIndicator instruction={getInstruction(dropTarget)} />
    </Box>
  );
};

export const TreeNode = ({
  level,
  tabbable,
  isSelected,
  isHighlighted,
  isExpanded,
  onExpand,
  nodeProps,
  buttonProps,
  action,
  children,
}: {
  level: number;
  tabbable?: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  isExpanded?: undefined | boolean;
  onExpand?: (expanded: boolean, all: boolean) => void;
  nodeProps?: ComponentPropsWithoutRef<"div">;
  buttonProps: ComponentPropsWithoutRef<"button">;
  action?: ReactNode;
  children: ReactNode;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // scroll the selected button into view when selected from canvas.
  useEffect(() => {
    if (isSelected) {
      buttonRef.current?.scrollIntoView({
        // smooth behavior in both canvas and navigator confuses chrome
        behavior: "auto",
        block: "nearest",
      });
    }
  }, [isSelected]);

  const handleKeydown = (event: KeyboardEvent<HTMLDivElement>) => {
    nodeProps?.onKeyDown?.(event);

    if (event.defaultPrevented) {
      return;
    }
    if (event.key === "ArrowLeft" && isExpanded === true) {
      onExpand?.(false, event.altKey);
      // allow to collapse and then navigate to previous node
      event.preventDefault();
    }
    if (event.key === "ArrowRight" && isExpanded === false) {
      onExpand?.(true, event.altKey);
      // allow to expand and then navigate to next node
      event.preventDefault();
    }
    if (event.key === " ") {
      onExpand?.(isExpanded === false, event.altKey);
      // prevent scrolling
      event.preventDefault();
    }
  };

  return (
    <NodeContainer
      {...nodeProps}
      css={{ [treeNodeLevel]: level }}
      onKeyDown={handleKeydown}
    >
      <DepthBars />
      <NodeButton
        {...buttonProps}
        ref={buttonRef}
        tabIndex={tabbable || level === 0 ? undefined : -1}
        aria-selected={isSelected}
        aria-current={isHighlighted}
        data-tree-button
      >
        {children}
      </NodeButton>
      {isExpanded !== undefined && (
        <ExpandButton
          tabIndex={-1}
          onClick={(event) => onExpand?.(isExpanded === false, event.altKey)}
        >
          {isExpanded ? (
            <ChevronDownIcon size="12" />
          ) : (
            <ChevronRightIcon size="12" />
          )}
        </ExpandButton>
      )}
      {action && <ActionContainer data-tree-action>{action}</ActionContainer>}
    </NodeContainer>
  );
};

export const TreeNodeLabel = ({
  children,
  prefix,
  ...props
}: {
  children: ReactNode;
  prefix?: ReactNode;
}) => {
  return (
    <>
      {prefix}
      <Text
        variant="labelsSentenceCase"
        truncate
        css={{
          marginLeft: prefix ? theme.spacing[3] : 0,
          flexBasis: 0,
          flexGrow: 1,
        }}
        {...props}
      >
        {children}
      </Text>
    </>
  );
};
