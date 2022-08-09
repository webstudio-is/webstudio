/* eslint-disable */

// @todo: enable eslint
// @todo: delete file if not used

import { useState, useMemo, useCallback, useRef } from "react";
import { type Instance, components } from "@webstudio-is/react-sdk";
import {
  Flex,
  Text,
  Button,
  type DropTarget,
  type Point,
  useAutoScroll,
  useDrag,
  useDrop,
} from "@webstudio-is/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
import { getInstancePath } from "~/shared/tree-utils";

type FlatNode = {
  instance: Instance;
  depth: number;
  isOpen: boolean;
  areParentsOpen: boolean;

  // @todo: remove if not needed
  indexWithinVisible: number;
};

const flattenTree = (
  root: Instance,
  isOpenRecord: Record<Instance["id"], boolean | undefined>,
  selectedInstancePath: Instance[]
) => {
  let indexWithinVisible = 0;
  const result: Array<FlatNode> = [];

  const traverse = (
    instance: Instance,
    depth: number,
    areParentsOpen: boolean
  ) => {
    const isOpen =
      (isOpenRecord[instance.id] ?? false) ||
      selectedInstancePath.some((item) => item.id === instance.id);

    result.push({
      instance,
      depth,
      indexWithinVisible,
      isOpen,
      areParentsOpen,
    });

    if (areParentsOpen) {
      indexWithinVisible++;
    }

    for (const child of instance.children) {
      if (typeof child === "string") {
        continue;
      }
      traverse(child, depth + 1, isOpen && areParentsOpen);
    }
  };

  traverse(root, 0, true);
  return result;
};

const Node = ({
  instance,
  depth,
  isOpen,
  isSelected,
  onSelect,
  setOpen,
  areParentsOpen,
}: FlatNode & {
  isSelected: boolean;
  onSelect: (instance: Instance) => void;
  setOpen: (id: Instance["id"], open: boolean) => void;
}) => {
  if (!areParentsOpen) {
    return null;
  }

  const hasChildren =
    instance.children.length > 1 || typeof instance.children[0] === "object";

  const { Icon, label } = components[instance.component];

  return (
    <Flex
      css={{
        // @todo don't hardcode the padding
        paddingLeft: depth * 15 + (hasChildren ? 0 : 15),
        color: "$hiContrast",
        alignItems: "center",
      }}
    >
      {hasChildren && (
        <Button
          css={{ padding: 0 }}
          ghost
          onClick={() => setOpen(instance.id, !isOpen)}
        >
          {isOpen ? <TriangleDownIcon /> : <TriangleRightIcon />}
        </Button>
      )}
      <Button
        {...(isSelected ? { state: "active" } : { ghost: true })}
        css={{ display: "flex", gap: "$1", padding: "$1" }}
        onFocus={() => onSelect(instance)}
        data-drag-item-id={instance.id}
      >
        <Icon />
        <Text>{label}</Text>
      </Button>
    </Flex>
  );
};

type TreeProps = {
  root: Instance;
  selectedInstanceId?: Instance["id"];
  onSelect?: (instance: Instance) => void;

  // @todo: add animation support
  animate?: boolean;
};

export const Tree = ({
  root,
  selectedInstanceId,
  onSelect = () => null,
}: TreeProps) => {
  const [isOpen, setOpen] = useRecordState<boolean>({});

  const flatTree = useMemo(() => {
    return flattenTree(
      root,
      isOpen,
      selectedInstanceId !== undefined
        ? getInstancePath(root, selectedInstanceId)
        : []
    );
  }, [root, isOpen, selectedInstanceId]);

  const rootRef = useRef<HTMLDivElement | null>(null);

  // All we use from useDrop is just the index?
  const dropHandlers = useDrop<true>({
    elementToData: (element) => {
      return element === rootRef.current;
    },
    swapDropTarget: (dropTarget) => {
      if (dropTarget) {
        return dropTarget;
      }
      return { element: rootRef.current as Element, data: true };
    },
    onDropTargetChange: (dropTarget) => {
      console.log("onDropTargetChange", dropTarget);
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
      dropHandlers.handleEnd();
    },
  });

  return (
    <Flex
      direction="column"
      ref={(element) => {
        rootRef.current = element;
        dropHandlers.rootRef(element);
        dragHandlers.rootRef(element);
      }}
    >
      {flatTree.map((node) => (
        <Node
          {...node}
          isSelected={selectedInstanceId === node.instance.id}
          onSelect={onSelect}
          setOpen={setOpen}
          key={node.instance.id}
        />
      ))}
    </Flex>
  );
};

const useRecordState = <T,>(initialState: Record<string, T>) => {
  const [state, setState] =
    useState<Record<string, T | undefined>>(initialState);
  const setItem = useCallback((key: string, value: T) => {
    setState((state) => ({ ...state, [key]: value }));
  }, []);
  return [state, setItem] as const;
};
