import { useState, useMemo, forwardRef, useRef, useCallback } from "react";
import { type Instance, components } from "@webstudio-is/react-sdk";
import {
  Flex,
  Text,
  Collapsible,
  Button,
  keyframes,
  styled,
  type DropTarget,
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
} & ExpandState;

// eslint-disable-next-line react/display-name
const Node = forwardRef<HTMLDivElement, NodeProps>(
  ({ instance, level, ...commonProps }, ref) => {
    const {
      getIsExpanded,
      animate,
      setIsExpanded,
      selectedInstanceId,
      onSelect,
      selectedInstancePath,
    } = commonProps;

    const isExpandable = getIsExpandable(instance);
    const isExpanded =
      getIsExpanded(instance) ||
      selectedInstancePath.some((item) => item.id === instance.id);
    const isSelected = instance.id === selectedInstanceId;

    const { Icon, label } = components[instance.component];

    const CollapsibleContent = animate
      ? CollapsibleContentAnimated
      : CollapsibleContentUnanimated;

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
          <CollapsibleContent>
            {instance.children.flatMap((child) =>
              typeof child === "string"
                ? []
                : [
                    <Node
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

type TreeProps = {
  root: Instance;
  selectedInstanceId?: Instance["id"];
  onSelect?: (instance: Instance) => void;
  animate?: boolean;
};

// eslint-disable-next-line react/display-name
const BaseTree = forwardRef<HTMLDivElement, TreeProps & ExpandState>(
  (
    {
      root,
      selectedInstanceId,
      onSelect = () => null,
      animate = true,
      getIsExpanded,
      setIsExpanded,
    },
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
        getIsExpanded={getIsExpanded}
        setIsExpanded={setIsExpanded}
        ref={ref}
      />
    );
  }
);

export const Tree = (props: TreeProps) => {
  const expandState = useExpandState();
  return <BaseTree {...props} {...expandState} />;
};

export const SortableTree = (
  props: TreeProps & {
    onDragEnd: (event: {
      instanceId: Instance["id"];
      dropTarget: { instanceId: Instance["id"]; position: number };
    }) => void;
  }
) => {
  const { root, onDragEnd } = props;

  const expandState = useExpandState();

  const rootRef = useRef<HTMLElement | null>(null);

  const [dragItem, setDragItem] = useState<Instance>();
  const [dropTarget, setDropTarget] = useState<DropTarget<Instance>>();

  // @todo: not sure what this should return,
  // need to understand better when it's used
  //
  // maybe we should return previous dropTarget, or current dragItem's parent?
  const getFallbackDropTarget = () => {
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
      <BaseTree
        {...props}
        {...expandState}
        animate={props.animate && dropTarget === undefined}
        ref={(element) => {
          rootRef.current = element;
          dragHandlers.rootRef(element);
          dropHandlers.rootRef(element);
        }}
      />
      {dropTarget && (
        <PlacementIndicator
          root={root}
          getIsExpanded={expandState.getIsExpanded}
          dropTarget={dropTarget}
        />
      )}
    </>
  );
};

const PlacementIndicator = ({
  root,
  dropTarget,
  getIsExpanded,
}: {
  root: Instance;
  getIsExpanded: (instanceId: Instance) => boolean;
  dropTarget: DropTarget<Instance>;
}) => {
  const depth = useMemo(() => {
    // We only need depth if we're rendering a line
    if (getIsExpanded(dropTarget.data)) {
      return getInstancePath(root, dropTarget.data.id).length;
    }
    return undefined;
  }, [dropTarget.data, getIsExpanded, root]);

  if (depth !== undefined) {
    const { placement } = dropTarget;

    // @todo: fix magic numbers
    const shift = depth * 15 + 15 + 4;

    return createPortal(
      <Box
        style={{
          top: placement.y - 1,
          left: placement.x + shift,
          width: placement.length - shift,
          height: 2,
        }}
        css={{
          boxSizing: "content-box",
          position: "absolute",
          background: "#f531b3",
          pointerEvents: "none",
        }}
      >
        <Box
          css={{
            // @todo: fix magic numbers
            width: 8,
            height: 8,
            top: -3,
            left: -7,
            position: "absolute",
            border: "solid 2px #f531b3",
            borderRadius: "50%",
          }}
        />
      </Box>,
      document.body
    );
  }

  const { rect } = dropTarget;

  return createPortal(
    <Box
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
      css={{
        position: "absolute",
        pointerEvents: "none",
        outline: "2px solid #f531b3",
        borderRadius: 6,
      }}
    />,
    document.body
  );
};

const getIsExpandable = (instance: Instance) => {
  return (
    // Text nodes have only one child which is a string.
    instance.children.length > 1 || typeof instance.children[0] === "object"
  );
};

type ExpandState = {
  getIsExpanded: (instance: Instance) => boolean;
  setIsExpanded: (instanceId: Instance["id"], expanded: boolean) => void;
};

const useExpandState = (): ExpandState => {
  const [record, setRecord] = useState<Record<Instance["id"], boolean>>({});

  const getIsExpanded = useCallback(
    (instance: Instance) =>
      getIsExpandable(instance) && record[instance.id] === true,
    [record]
  );

  const setIsExpanded = useCallback(
    (instanceId: Instance["id"], expanded: boolean) => {
      setRecord((record) => ({ ...record, [instanceId]: expanded }));
    },
    []
  );

  return { getIsExpanded, setIsExpanded };
};
