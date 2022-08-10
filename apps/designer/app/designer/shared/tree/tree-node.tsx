import { forwardRef, useCallback, useRef, useEffect } from "react";
import { type Instance, components } from "@webstudio-is/react-sdk";
import {
  Flex,
  Text,
  Collapsible,
  Button,
  keyframes,
  styled,
} from "@webstudio-is/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
import noop from "lodash.noop";

export const getIsExpandable = (instance: Instance) => {
  return (
    // Text nodes have only one child which is a string.
    instance.children.length > 1 || typeof instance.children[0] === "object"
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
  instance: Instance;
  selectedInstanceId: Instance["id"] | undefined;
  selectedInstancePath: Array<Instance>;
  level: number;
  onSelect?: (instance: Instance) => void;
  animate?: boolean;
  getIsExpanded: (instance: Instance) => boolean;
  setIsExpanded: (instanceId: Instance["id"], expanded: boolean) => void;
  onAnimationEnd?: () => void;
};

export const TreeNode = forwardRef<HTMLDivElement, TreeNodeProps>(
  ({ instance, level, ...commonProps }, ref) => {
    const {
      getIsExpanded,
      animate = true,
      setIsExpanded,
      selectedInstanceId,
      onSelect = noop,
      selectedInstancePath,
      onAnimationEnd = noop,
    } = commonProps;

    const collapsibleContentRef = useRef<HTMLDivElement>(null);

    const isExpandable = getIsExpandable(instance);
    const isExpanded =
      getIsExpanded(instance) ||
      selectedInstancePath.some((item) => item.id === instance.id);
    const isSelected = instance.id === selectedInstanceId;

    const { Icon, label } = components[instance.component];

    const CollapsibleContent = animate
      ? CollapsibleContentAnimated
      : CollapsibleContentUnanimated;

    const handleAnimationEnd = useCallback(
      (event: React.AnimationEvent<HTMLDivElement>) => {
        if (event.target === collapsibleContentRef.current) {
          onAnimationEnd();
        }
      },
      [onAnimationEnd]
    );

    const prevIsExpanded = useRef(isExpanded);
    useEffect(() => {
      if (animate === false && isExpanded !== prevIsExpanded.current) {
        onAnimationEnd();
      }
      prevIsExpanded.current = isExpanded;
    }, [animate, onAnimationEnd, isExpanded]);

    return (
      <Collapsible.Root
        ref={ref}
        open={isExpanded}
        onOpenChange={(isOpen: boolean) => setIsExpanded(instance.id, isOpen)}
        data-drop-target-id={instance.id}
      >
        <Flex
          css={{
            // @todo don't hardcode the padding
            paddingLeft: level * 15 + (isExpandable ? 0 : 15),
            color: "$hiContrast",
            alignItems: "center",
          }}
        >
          {isExpandable && (
            <Collapsible.Trigger asChild>
              {isExpanded ? <TriangleDownIcon /> : <TriangleRightIcon />}
            </Collapsible.Trigger>
          )}
          <Button
            {...(isSelected ? { state: "active" } : { ghost: true })}
            css={{ display: "flex", gap: "$1", padding: "$1" }}
            data-drag-item-id={instance.id}
            onFocus={() => onSelect(instance)}
          >
            <Icon />
            <Text size="1">{label}</Text>
          </Button>
        </Flex>
        {isExpandable && (isExpanded || animate) && (
          <CollapsibleContent
            onAnimationEnd={handleAnimationEnd}
            ref={collapsibleContentRef}
          >
            {instance.children.flatMap((child) =>
              typeof child === "string"
                ? []
                : [
                    <TreeNode
                      key={child.id}
                      instance={child}
                      level={level + 1}
                      {...commonProps}
                    />,
                  ]
            )}
          </CollapsibleContent>
        )}
      </Collapsible.Root>
    );
  }
);
TreeNode.displayName = "TreeNode";
