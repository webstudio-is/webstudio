import { forwardRef, useCallback, useRef, useEffect } from "react";
import { type Instance, components } from "@webstudio-is/react-sdk";
import {
  Flex,
  Text,
  Collapsible,
  keyframes,
  styled,
  Box,
} from "@webstudio-is/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
import noop from "lodash.noop";

export const INDENT = 16;
const ITEM_HEIGHT = 32;
const ICONS_SIZE = 15;
const ITEM_PADDING = 8;

export const getPlacementIndicatorAlignment = (depth: number) => {
  return depth * INDENT + ITEM_PADDING;
};

export const getIsExpandable = (instance: Instance) => {
  return (
    // Text nodes have only one child which is a string.
    instance.children.length > 1 || typeof instance.children[0] === "object"
  );
};

const CustomButton = styled("button", {
  all: "unset",
  display: "flex",
  alignItems: "center",
  gap: "$1",
  boxSizing: "border-box",
  userSelect: "none",
  height: ITEM_HEIGHT,
  margin: 0,
  padding: 0,
  flexBasis: 0,
  flexGrow: 1,
  variants: {
    enableHoverState: {
      true: {
        "&:hover :before": {
          content: "''",
          display: "block",
          position: "absolute",
          left: 2,
          right: 2,
          top: 0,
          bottom: 0,
          boxSizing: "border-box",
          border: "solid $blue10",
          borderWidth: "$2",
          borderRadius: "$2",
          pointerEvents: "none",
        },
      },
    },
  },
});

const nestingLineStyles = {
  width: Math.ceil(INDENT / 2),
  height: ITEM_HEIGHT,
  borderRight: "solid",
  borderRightWidth: "$1",
  borderColor: "$slate9",
};
const nestingLineStylesSelected = {
  ...nestingLineStyles,
  borderColor: "$blue7",
};

const NestingLines = ({
  isSelected,
  level,
  followedByExpandButton,
}: {
  isSelected: boolean;
  level: number;
  followedByExpandButton: boolean;
}) => {
  if (level === 0) {
    return null;
  }

  if (level === 1) {
    return followedByExpandButton ? null : <Box css={{ width: INDENT }} />;
  }

  return (
    <>
      {Array.from({ length: level - 1 }, (_, i) => (
        <Box
          key={i}
          style={{
            marginRight:
              Math.floor(INDENT / 2) +
              (!followedByExpandButton && i === level - 2 ? INDENT : 0),
          }}
          css={isSelected ? nestingLineStylesSelected : nestingLineStyles}
        />
      ))}
    </>
  );
};

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

type TreeNodeProps = {
  disableHoverStates?: boolean;
  instance: Instance;
  selectedInstanceId: Instance["id"] | undefined;
  parentIsSelected?: boolean;
  level: number;
  onSelect?: (instance: Instance) => void;
  animate?: boolean;
  getIsExpanded: (instance: Instance) => boolean;
  setIsExpanded: (instance: Instance, expanded: boolean) => void;
  onExpandTransitionEnd?: () => void;
};

export const TreeNode = forwardRef<HTMLDivElement, TreeNodeProps>(
  ({ instance, level, parentIsSelected, ...commonProps }, ref) => {
    const {
      getIsExpanded,
      animate = true,
      setIsExpanded,
      selectedInstanceId,
      onSelect = noop,
      onExpandTransitionEnd = noop,
      disableHoverStates = false,
    } = commonProps;

    const collapsibleContentRef = useRef<HTMLDivElement>(null);

    const isAlwaysExpanded = level === 0;
    const isExpandable = getIsExpandable(instance);
    const isExpanded = getIsExpanded(instance) || isAlwaysExpanded;
    const isSelected = instance.id === selectedInstanceId;

    const makeSelected = () => {
      if (isSelected === false) {
        onSelect(instance);
      }
    };

    const shouldRenderExpandButton = isExpandable && isAlwaysExpanded === false;

    const { Icon, label } = components[instance.component];

    const CollapsibleContent = animate
      ? CollapsibleContentAnimated
      : CollapsibleContentUnanimated;

    const handleAnimationEnd = useCallback(
      (event: React.AnimationEvent<HTMLDivElement>) => {
        if (event.target === collapsibleContentRef.current) {
          onExpandTransitionEnd();
        }
      },
      [onExpandTransitionEnd]
    );

    // If ther's no animation, we need to manually trigger onExpandTransitionEnd
    const prevIsExpanded = useRef(isExpanded);
    useEffect(() => {
      if (animate === false && isExpanded !== prevIsExpanded.current) {
        onExpandTransitionEnd();
      }
      prevIsExpanded.current = isExpanded;
    }, [animate, onExpandTransitionEnd, isExpanded]);

    return (
      <Collapsible.Root
        ref={ref}
        open={isExpanded}
        onOpenChange={(isOpen) => setIsExpanded(instance, isOpen)}
        data-drop-target-id={instance.id}
      >
        <Flex
          css={{
            color: isSelected ? "$loContrast" : "$hiContrast",
            alignItems: "center",
            pr: ITEM_PADDING,
            pl: ITEM_PADDING,
            backgroundColor: isSelected
              ? "$blue10"
              : parentIsSelected
              ? "$blue4"
              : "transparent",
            position: "relative",
          }}
        >
          <NestingLines
            isSelected={isSelected}
            level={level}
            followedByExpandButton={shouldRenderExpandButton}
          />
          {shouldRenderExpandButton && (
            <Collapsible.Trigger asChild>
              <Flex
                css={{
                  pr: INDENT - ICONS_SIZE,
                  height: ITEM_HEIGHT,
                  alignItems: "center",

                  // We want the button to take extra space so it's easier to hit
                  ml: "-$2",
                  pl: "$2",
                }}
              >
                {isExpanded ? <TriangleDownIcon /> : <TriangleRightIcon />}
              </Flex>
            </Collapsible.Trigger>
          )}
          <CustomButton
            data-drag-item-id={instance.id}
            onFocus={makeSelected}
            onClick={makeSelected}
            enableHoverState={disableHoverStates === false}
          >
            <Icon />
            <Text
              size="1"
              variant={isSelected ? "loContrast" : "contrast"}
              css={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.4,
                flexBasis: 0,
                flexGrow: 1,

                // For some reason flexBasis:0 is not anough
                // to stop it growing past the container
                width: 0,
              }}
            >
              {label}
            </Text>
          </CustomButton>
        </Flex>
        {isExpandable && (
          <CollapsibleContent
            onAnimationEnd={handleAnimationEnd}
            ref={collapsibleContentRef}
          >
            {
              // CollapsibleContent doesn't render children when collapsed.
              // No need to worry about optimizing this.
              instance.children.flatMap((child) =>
                typeof child === "string"
                  ? []
                  : [
                      <TreeNode
                        key={child.id}
                        instance={child}
                        level={level + 1}
                        parentIsSelected={isSelected || parentIsSelected}
                        {...commonProps}
                      />,
                    ]
              )
            }
          </CollapsibleContent>
        )}
      </Collapsible.Root>
    );
  }
);
TreeNode.displayName = "TreeNode";
