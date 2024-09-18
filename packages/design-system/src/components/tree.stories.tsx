import { useMemo, useState } from "react";
import { EllipsesIcon } from "@webstudio-is/icons";
import { SmallIconButton } from "./small-icon-button";
import { Box } from "./box";
import { TreeRoot, TreeNode, TreeNodeLabel } from "./tree";

export default {
  title: "Library/Tree",
};

type Node = {
  name: string;
  children: Node[];
};

type FlatNode = {
  name: string;
  level: number;
  isExpanded?: boolean;
};

const data: Node = {
  name: "Root",
  children: [
    {
      name: "Box 1",
      children: [
        { name: "Box 2", children: [] },
        { name: "Container 1", children: [] },
        { name: "Wrapper 1", children: [] },
      ],
    },
    {
      name: "Container 2",
      children: [
        { name: "Box 3", children: [] },
        { name: "Container 3", children: [] },
        { name: "Wrapper 2", children: [] },
      ],
    },
    {
      name: "Wrapper 3",
      children: [
        { name: "Box 4", children: [] },
        { name: "Container 4", children: [] },
        { name: "Wrapper 4", children: [] },
      ],
    },
  ],
};

export const Tree = () => {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [expandedItems, setExpandedItems] = useState(new Set<string>());
  const flatTree = useMemo(() => {
    const flatTree: FlatNode[] = [];
    const traverse = (node: Node, level = 0) => {
      let isExpanded;
      if (level > 0 && node.children.length > 0) {
        isExpanded = expandedItems.has(node.name);
      }
      // hide root folder
      flatTree.push({
        name: node.name,
        level,
        isExpanded,
      });
      if (level === 0 || isExpanded) {
        for (const child of node.children) {
          traverse(child, level + 1);
        }
      }
    };
    traverse(data);
    return flatTree;
  }, [expandedItems]);
  return (
    <Box css={{ maxWidth: 300 }}>
      <TreeRoot>
        {flatTree.map((node) => (
          <TreeNode
            key={node.name}
            level={node.level}
            isSelected={node.name === selectedItemId}
            isExpanded={node.isExpanded}
            onExpand={(isExpanded) => {
              setExpandedItems((prevExpandedItems) => {
                const newExpandedItems = new Set(prevExpandedItems);
                if (isExpanded) {
                  newExpandedItems.add(node.name);
                } else {
                  newExpandedItems.delete(node.name);
                }
                return newExpandedItems;
              });
            }}
            buttonProps={{
              onClick: () => {
                setSelectedItemId(node.name);
              },
            }}
            action={<SmallIconButton tabIndex={-1} icon={<EllipsesIcon />} />}
          >
            <TreeNodeLabel>{node.name}</TreeNodeLabel>
          </TreeNode>
        ))}
      </TreeRoot>
    </Box>
  );
};
