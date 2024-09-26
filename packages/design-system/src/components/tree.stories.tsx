import { useMemo, useState } from "react";
import { EllipsesIcon } from "@webstudio-is/icons";
import { SmallIconButton } from "./small-icon-button";
import { Box } from "./box";
import {
  TreeRoot,
  TreeNode,
  TreeNodeLabel,
  TreeSortableItem,
  type TreeDropTarget,
} from "./tree";

export default {
  title: "Library/Tree",
};

type Node = {
  name: string;
  children: Node[];
};

type FlatNode = {
  name: string;
  selector: string[];
  level: number;
  isExpanded?: boolean;
  isLastChild: boolean;
  dropTarget?: TreeDropTarget;
};

const findNode = (data: Node, name?: string) => {
  let matched: undefined | Node;
  const traverse = (node: Node) => {
    if (node.name === name) {
      matched = node;
      return;
    }
    for (const child of node.children) {
      traverse(child);
    }
  };
  traverse(data);
  return matched;
};

const move = ({
  data,
  sourceParentName,
  sourceName,
  dropTarget,
}: {
  data: Node;
  sourceParentName: string;
  sourceName: string;
  dropTarget: DropTarget;
}) => {
  const newData = structuredClone(data);
  const sourceParentNode = findNode(newData, sourceParentName);
  const sourceNode = findNode(newData, sourceName);
  const targetParentNode = findNode(newData, dropTarget.parentName);
  const targetBeforeNode = findNode(newData, dropTarget.beforeName);
  const targetAfterNode = findNode(newData, dropTarget.afterName);
  if (sourceParentNode && sourceNode) {
    const index = sourceParentNode.children.indexOf(sourceNode);
    sourceParentNode.children.splice(index, 1);
  }
  if (targetParentNode && sourceNode) {
    if (targetBeforeNode) {
      const index = targetParentNode.children.indexOf(targetBeforeNode);
      targetParentNode.children.splice(index, 0, sourceNode);
    } else if (targetAfterNode) {
      const index = targetParentNode.children.indexOf(targetAfterNode) + 1;
      targetParentNode.children.splice(index, 0, sourceNode);
    } else {
      targetParentNode.children.push(sourceNode);
    }
  }
  return newData;
};

const initialData: Node = {
  name: "Root",
  children: Array.from(Array(10)).map((_, index) => ({
    name: `Parent ${index + 1}`,
    children: [
      {
        name: `Box ${index + 1}.1`,
        children: [
          { name: `Box ${index + 1}.2`, children: [] },
          { name: `Container ${index + 1}.1`, children: [] },
          { name: `Wrapper ${index + 1}.1`, children: [] },
        ],
      },
      {
        name: `Container ${index + 1}.2`,
        children: [
          { name: `Box ${index + 1}.3`, children: [] },
          { name: `Container ${index + 1}.3`, children: [] },
          { name: `Wrapper ${index + 1}.2`, children: [] },
        ],
      },
      {
        name: `Wrapper ${index + 1}.3`,
        children: [
          { name: `Box ${index + 1}.4`, children: [] },
          { name: `Container ${index + 1}.4`, children: [] },
          { name: `Wrapper ${index + 1}.4`, children: [] },
        ],
      },
    ],
  })),
};

type DropTarget = {
  parentName: string;
  beforeName?: string;
  afterName?: string;
};

const getStoriesDropTarget = (
  node: FlatNode,
  dropTarget: undefined | TreeDropTarget
): undefined | DropTarget => {
  if (dropTarget === undefined) {
    return;
  }
  const parentName = node.selector.at(-dropTarget.parentLevel - 1);
  const beforeName =
    dropTarget.beforeLevel === undefined
      ? undefined
      : node.selector.at(-dropTarget.beforeLevel - 1);
  const afterName =
    dropTarget.afterLevel === undefined
      ? undefined
      : node.selector.at(-dropTarget.afterLevel - 1);
  if (parentName) {
    return { parentName, beforeName, afterName };
  }
};

export const Tree = () => {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [expandedItems, setExpandedItems] = useState(new Set<string>());
  const [data, setData] = useState(initialData);
  const [dropTarget, setDropTarget] = useState<undefined | DropTarget>();
  const flatTree = useMemo(() => {
    const flatTree: FlatNode[] = [];
    const traverse = (
      node: Node,
      selector: string[],
      isLastChild = false,
      level = 0
    ) => {
      let isExpanded;
      if (level > 0 && node.children.length > 0) {
        isExpanded = expandedItems.has(node.name);
      }
      // hide root folder
      const flatNode: FlatNode = {
        name: node.name,
        selector,
        level,
        isExpanded,
        isLastChild,
      };
      flatTree.push(flatNode);
      let lastFlatNode = flatNode;
      if (level === 0 || isExpanded) {
        for (const child of node.children) {
          const isLastChild = node.children.at(-1) === child;
          lastFlatNode = traverse(
            child,
            [child.name, ...selector],
            isLastChild,
            level + 1
          );
        }
      }
      if (dropTarget?.beforeName === node.name) {
        flatNode.dropTarget = {
          parentLevel: level - 1,
          beforeLevel: level,
        };
      }
      if (dropTarget?.afterName === node.name) {
        lastFlatNode.dropTarget = {
          parentLevel: level - 1,
          afterLevel: level,
        };
      }
      return lastFlatNode;
    };
    traverse(data, [data.name], false);
    return flatTree;
  }, [data, expandedItems, dropTarget]);

  return (
    <Box css={{ maxWidth: 300 }}>
      <TreeRoot>
        {flatTree.map((node) => {
          const handleExpand = (isExpanded: boolean) => {
            setExpandedItems((prevExpandedItems) => {
              const newExpandedItems = new Set(prevExpandedItems);
              if (isExpanded) {
                newExpandedItems.add(node.name);
              } else {
                newExpandedItems.delete(node.name);
              }
              return newExpandedItems;
            });
          };

          return (
            <TreeSortableItem
              key={node.name}
              level={node.level}
              isExpanded={node.isExpanded}
              isLastChild={node.isLastChild}
              data={node}
              // prevent dragging root
              canDrag={() => node.level > 0}
              onExpand={handleExpand}
              dropTarget={node.dropTarget}
              onDropTargetChange={(dropTarget) => {
                // prevent dropping into toplevel
                if (dropTarget && dropTarget.parentLevel > 0) {
                  setDropTarget(getStoriesDropTarget(node, dropTarget));
                } else {
                  setDropTarget(undefined);
                }
              }}
              onDrop={(sourceNode) => {
                if (dropTarget) {
                  setData((data) =>
                    move({
                      data,
                      sourceParentName: sourceNode.selector[1],
                      sourceName: sourceNode.selector[0],
                      dropTarget,
                    })
                  );
                }
                setDropTarget(undefined);
              }}
            >
              <TreeNode
                level={node.level}
                isSelected={node.name === selectedItemId}
                isHighlighted={dropTarget?.parentName === node.name}
                isExpanded={node.isExpanded}
                onExpand={handleExpand}
                buttonProps={{
                  onFocus: () => {
                    setSelectedItemId(node.name);
                  },
                  onClick: () => {
                    setSelectedItemId(node.name);
                  },
                }}
                action={
                  <SmallIconButton tabIndex={-1} icon={<EllipsesIcon />} />
                }
              >
                <TreeNodeLabel>{node.name}</TreeNodeLabel>
              </TreeNode>
            </TreeSortableItem>
          );
        })}
      </TreeRoot>
    </Box>
  );
};
