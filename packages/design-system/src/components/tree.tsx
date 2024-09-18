import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FocusScope, useFocusManager } from "@react-aria/focus";
import {
  ChevronFilledDownIcon,
  ChevronFilledRightIcon,
} from "@webstudio-is/icons";
import { styled, theme } from "../stitches.config";
import { Box } from "./box";
import { Text } from "./text";

const treeNodeLevel = "--tree-node-level";
const treeActionOpacity = "--tree-action-opacity";
const treeDepthBarsVisibility = "--tree-depth-bars-visibility";
const treeDepthBarsColor = "--tree-depth-bars-color";

const ITEM_HEIGHT = 32;
const ITEM_PADDING_LEFT = 8;
// extra padding on the right to make sure scrollbar doesn't obscure anything
const ITEM_PADDING_RIGHT = 10;
const BARS_GAP = 16;
const EXPAND_WIDTH = 24;
const ACTION_WIDTH = 24;

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
  height: ITEM_HEIGHT,
  "&:hover, &:has(:focus-visible), &:has([aria-current=true])": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: -3,
    borderRadius: theme.borderRadius[6],
    [treeActionOpacity]: 1,
  },
  "&:has([aria-selected=true])": {
    backgroundColor: theme.colors.backgroundItemCurrent,
    [treeDepthBarsColor]: theme.colors.borderItemChildLineCurrent,
  },
  "&:has([data-tree-action])": {
    paddingRight: ACTION_WIDTH,
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
  position: "absolute",
  top: 0,
  right: ITEM_PADDING_RIGHT,
  width: ACTION_WIDTH,
  height: "inherit",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

export const TreeNode = ({
  level,
  tabbable,
  isSelected,
  isHighlighted,
  isExpanded,
  onExpand,
  buttonProps,
  action,
  children,
}: {
  level: number;
  tabbable?: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  isExpanded: undefined | boolean;
  onExpand: (expanded: boolean, all: boolean) => void;
  buttonProps: ComponentPropsWithoutRef<"button">;
  action?: ReactNode;
  children: ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // scroll the selected button into view when selected from canvas.
  useEffect(() => {
    if (isSelected) {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === "ArrowLeft" && isExpanded === true) {
      onExpand(false, event.altKey);
      // allow to collapse and then navigate to previous node
      event.preventDefault();
    }
    if (event.key === "ArrowRight" && isExpanded === false) {
      onExpand(true, event.altKey);
      // allow to expand and then navigate to next node
      event.preventDefault();
    }
    if (event.key === " ") {
      onExpand(isExpanded === false, event.altKey);
      // prevent scrolling
      event.preventDefault();
    }
  };

  return (
    <NodeContainer
      ref={containerRef}
      css={{ [treeNodeLevel]: level }}
      onKeyDown={handleKeydown}
    >
      <DepthBars />
      <NodeButton
        {...buttonProps}
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
          onClick={(event) => onExpand(isExpanded === false, event.altKey)}
        >
          {isExpanded ? <ChevronFilledDownIcon /> : <ChevronFilledRightIcon />}
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
