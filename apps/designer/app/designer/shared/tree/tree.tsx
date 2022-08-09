/* eslint-disable */
// @todo: enable eslint

import {
  useState,
  useMemo,
  useEffect,
  forwardRef,
  type ElementRef,
  useRef,
} from "react";
import { type Instance, components } from "@webstudio-is/react-sdk";
import {
  Flex,
  Text,
  Collapsible,
  Button,
  keyframes,
  styled,
  type DropTarget,
  type Point,
  useAutoScroll,
  useDrag,
  useDrop,
  Box,
} from "@webstudio-is/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
import { findInstanceById, getInstancePath } from "~/shared/tree-utils";

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

type NodeProps = {
  instance: Instance;
  selectedInstanceId: Instance["id"] | undefined;
  selectedInstancePath: Array<Instance>;
  level: number;
  onSelect: (instance: Instance) => void;
  animate: boolean;
};

// @todo: remove forwardRef if not needed
const Node = forwardRef<ElementRef<typeof Collapsible.Root>, NodeProps>(
  (
    {
      instance,
      selectedInstanceId,
      selectedInstancePath,
      level,
      onSelect,
      animate,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(
      selectedInstancePath.includes(instance)
    );

    useEffect(() => {
      setIsOpen(selectedInstancePath.includes(instance));
    }, [selectedInstancePath, instance]);

    // Text nodes have only one child which is a string.
    const showChildren =
      instance.children.length > 1 || typeof instance.children[0] === "object";

    const children = useMemo(() => {
      if ((isOpen === false && animate === false) || showChildren === false) {
        return null;
      }
      const children = [];
      for (const child of instance.children) {
        if (typeof child === "string") continue;
        children.push(
          <Node
            instance={child}
            selectedInstanceId={selectedInstanceId}
            selectedInstancePath={selectedInstancePath}
            level={level + 1}
            key={child.id}
            onSelect={onSelect}
            animate={animate}
          />
        );
      }
      return children;
    }, [
      instance,
      level,
      isOpen,
      selectedInstanceId,
      selectedInstancePath,
      onSelect,
      showChildren,
      animate,
    ]);

    const { Icon, label } = components[instance.component];
    const CollapsibleContent = animate
      ? CollapsibleContentAnimated
      : CollapsibleContentUnanimated;

    return (
      <Collapsible.Root
        ref={ref}
        open={isOpen}
        onOpenChange={setIsOpen}
        data-drop-target-id={instance.id}
      >
        <Flex
          css={{
            // @todo don't hardcode the padding
            paddingLeft: level * 15 + (showChildren ? 0 : 15),
            color: "$hiContrast",
            alignItems: "center",
          }}
        >
          {showChildren && (
            <Collapsible.Trigger asChild>
              {isOpen ? <TriangleDownIcon /> : <TriangleRightIcon />}
            </Collapsible.Trigger>
          )}
          <Button
            {...(instance.id === selectedInstanceId
              ? { state: "active" }
              : { ghost: true })}
            css={{ display: "flex", gap: "$1", padding: "$1" }}
            data-drag-item-id={instance.id}
            onFocus={() => {
              onSelect(instance);
            }}
          >
            <Icon />
            <Text size="1">{label}</Text>
          </Button>
        </Flex>
        {children != null && (
          <CollapsibleContent>{children}</CollapsibleContent>
        )}
      </Collapsible.Root>
    );
  }
);

type TreeProps = {
  root: Instance;
  selectedInstanceId?: Instance["id"];
  onSelect?: (instance: Instance) => void;
  animate?: boolean;
};

export const Tree = ({
  root,
  selectedInstanceId,
  onSelect = () => null,
  animate = true,
}: TreeProps) => {
  const selectedInstancePath = useMemo(
    () =>
      selectedInstanceId !== undefined
        ? getInstancePath(root, selectedInstanceId)
        : [],
    [root, selectedInstanceId]
  );

  const rootRef = useRef<HTMLElement | null>(null);

  const dropHandlers = useDrop<Instance>({
    elementToData: (element) => {
      const id = (element as HTMLElement).dataset.dropTargetId;
      const instance = id && findInstanceById(root, id);
      return instance || false;
    },

    // @todo: we need an ability to tell useDrop to keep previous drop target
    // because once user moves the cursor out of navigator
    // we loose the ability to meaningfully track the drop target
    //
    // OR: modify coordinates when passing to dropHandlers.handleMove()
    swapDropTarget: (dropTarget) => {
      console.log("swapDropTarget", dropTarget);

      if (dropTarget) {
        return dropTarget;
      }

      return { element: document.body as Element, data: root };
    },

    onDropTargetChange: (dropTarget) => {
      console.log("onDropTargetChange", dropTarget);
    },

    getValidChildren: (element) => {
      return Array.from(
        element.querySelectorAll(":scope > div > [data-drop-target-id]")
      );
    },
  });

  const dragHandlers = useDrag<Instance["id"]>({
    elementToData: (element) => {
      const dragItemElement = element.closest("[data-drag-item-id]");
      if (!(dragItemElement instanceof HTMLElement)) {
        return false;
      }
      const id = dragItemElement.dataset.dragItemId;
      if (id === undefined || id === root.id) {
        return false;
      }
      return id;
    },
    onStart: ({ data }) => {
      console.log("drag start", data);
    },
    onMove: (point) => {
      dropHandlers.handleMove(point);
    },
    onEnd: ({ isCanceled }) => {
      console.log("drag end", isCanceled);
      dropHandlers.handleEnd();
    },
  });

  return (
    <Box
      ref={(element) => {
        rootRef.current = element;
        dragHandlers.rootRef(element);
        dropHandlers.rootRef(element);
      }}
    >
      <Node
        instance={root}
        selectedInstanceId={selectedInstanceId}
        selectedInstancePath={selectedInstancePath}
        onSelect={onSelect}
        animate={animate}
        level={0}
      />
    </Box>
  );
};
