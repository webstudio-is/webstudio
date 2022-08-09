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
  PlacementIndicator,
  useAutoScroll,
  useDrag,
  useDrop,
  Box,
} from "@webstudio-is/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
import { findInstanceById, getInstancePath } from "~/shared/tree-utils";
import { createPortal } from "react-dom";

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

export const Tree = forwardRef<ElementRef<typeof Node>, TreeProps>(
  (
    { root, selectedInstanceId, onSelect = () => null, animate = true },
    ref
  ) => {
    const selectedInstancePath = useMemo(
      () =>
        selectedInstanceId !== undefined
          ? getInstancePath(root, selectedInstanceId)
          : [],
      [root, selectedInstanceId]
    );
    return (
      <Node
        instance={root}
        selectedInstanceId={selectedInstanceId}
        selectedInstancePath={selectedInstancePath}
        onSelect={onSelect}
        animate={animate}
        level={0}
        ref={ref}
      />
    );
  }
);

export const SortableTree = (
  props: TreeProps & {
    onDragEnd: (event: {
      instanceId: Instance["id"];
      dropTarget: { instanceId: Instance["id"]; position: number };
    }) => void;
  }
) => {
  const { root, onDragEnd } = props;

  const rootRef = useRef<HTMLElement | null>(null);

  const [dragItem, setDragItem] = useState<Instance>();
  const [dropTarget, setDropTarget] = useState<DropTarget<Instance>>();

  // @todo: not sure what this should return,
  // need to understand better when it's used
  //
  // maybe we should return previous dropTarget, or current dragItem's parent?
  const getFallbackDropTarget = () => {
    console.warn("getFallbackDropTarget");
    return {
      data: root,
      element: rootRef.current as HTMLElement,
    };
  };

  const dropHandlers = useDrop<Instance>({
    // We don't want drop target to fall back to root
    // when user moves pointer outside of the tree.
    emulatePointerAlwaysInRootBounds: true,

    placementPadding: 0,

    elementToData: (element) => {
      const id = (element as HTMLElement).dataset.dropTargetId;
      const instance = id && findInstanceById(root, id);
      return instance || false;
    },

    swapDropTarget: (dropTarget) => {
      console.log("swapDropTarget", dropTarget);

      if (dragItem === undefined || dropTarget === undefined) {
        return getFallbackDropTarget();
      }

      if (dropTarget.data.id === root.id) {
        return dropTarget;
      }

      const path = getInstancePath(root, dropTarget.data.id);
      path.reverse();

      if (dropTarget.area === "top" || dropTarget.area === "bottom") {
        path.shift();
      }

      // Don't allow to drop inside drag item or any of its children
      const dragItemIndex = path.findIndex(
        (instance) => instance.id === dragItem.id
      );
      if (dragItemIndex !== -1) {
        path.splice(0, dragItemIndex + 1);
      }

      const data = path.find((instance) =>
        components[instance.component].canAcceptChild()
      );

      if (!data) {
        return getFallbackDropTarget();
      }

      const element =
        data &&
        rootRef.current?.querySelector(`[data-drop-target-id="${data.id}"]`);

      if (element == null) {
        return getFallbackDropTarget();
      }

      return { data, element };
    },

    onDropTargetChange: (dropTarget) => {
      console.log("onDropTargetChange", dropTarget);
      setDropTarget(dropTarget);
    },

    getValidChildren: (element) => {
      return Array.from(
        // @todo: if this works as expected, we need a selector that assumes less about the DOM structure
        element.querySelectorAll(":scope > div > [data-drop-target-id]")
      );
    },
  });

  const dragHandlers = useDrag<Instance>({
    elementToData: (element) => {
      const dragItemElement = element.closest("[data-drag-item-id]");
      if (!(dragItemElement instanceof HTMLElement)) {
        return false;
      }
      const id = dragItemElement.dataset.dragItemId;
      if (id === undefined || id === root.id) {
        return false;
      }
      return findInstanceById(root, id) || false;
    },
    onStart: ({ data }) => {
      setDragItem(data);
    },
    onMove: (point) => {
      dropHandlers.handleMove(point);
    },
    onEnd: ({ isCanceled }) => {
      if (dropTarget && dragItem && isCanceled === false) {
        onDragEnd({
          instanceId: dragItem.id,
          dropTarget: {
            instanceId: dropTarget.data.id,
            position: dropTarget.indexWithinChildren,
          },
        });
      }

      setDragItem(undefined);
      setDropTarget(undefined);
      dropHandlers.handleEnd();
    },
  });

  return (
    <>
      <Tree
        {...props}
        ref={(element) => {
          rootRef.current = element;
          dragHandlers.rootRef(element);
          dropHandlers.rootRef(element);
        }}
      />
      {/* @todo: need to render an outline instead of the line when there're no children */}
      {/* @todo: need to adjust line length according to the depth of the drop target inside the tree */}
      {dropTarget && (
        <PlacementIndicatorLayer placement={dropTarget.placement} />
      )}
    </>
  );
};

const PlacementIndicatorLayer = (
  props: React.ComponentProps<typeof PlacementIndicator>
) => {
  return createPortal(<PlacementIndicator {...props} />, document.body);
};
