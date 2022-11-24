import { ComponentMeta } from "@storybook/react";
import { useState } from "react";
import { Tree } from "./tree";
import {
  canAcceptChild,
  findItemById,
  getItemChildren,
  getItemPath,
  getItemPathWithPositions,
  Item,
  reparent,
} from "./test-tree-data";
import { Flex } from "../flex";
import { TreeItemLabel, TreeItemBody } from "./tree-node";

export const StressTest = ({ animate }: { animate: boolean }) => {
  const [root, setRoot] = useState<Item>((): Item => {
    return {
      id: "root",
      canAcceptChildren: true,
      children: Array.from(
        { length: 100 },
        (_, index): Item => ({
          id: `box-${index}`,
          canAcceptChildren: true,
          children: [
            {
              id: `heading-${index}.0`,
              canAcceptChildren: false,
              children: [],
            },
            {
              id: `paragraph-${index}.0`,
              canAcceptChildren: false,
              children: [],
            },
            {
              id: `box-${index}.0`,
              canAcceptChildren: true,
              children: [
                {
                  id: `box-${index}.0.0`,
                  canAcceptChildren: true,
                  children: [
                    {
                      id: `box-${index}.0.0.0`,
                      canAcceptChildren: true,
                      children: [
                        {
                          id: `heading-${index}.1`,
                          canAcceptChildren: false,
                          children: [],
                        },
                        {
                          id: `paragraph-${index}.1`,
                          canAcceptChildren: false,
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: `box-${index}.0.1`,
                  canAcceptChildren: true,
                  children: [],
                },
              ],
            },
          ],
        })
      ),
    };
  });

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  return (
    <Flex css={{ width: 300, height: 500, flexDirection: "column" }}>
      <Tree
        findItemById={findItemById}
        getItemPathWithPositions={getItemPathWithPositions}
        getItemPath={getItemPath}
        canAcceptChild={canAcceptChild}
        canLeaveParent={() => true}
        getItemChildren={getItemChildren}
        animate={animate}
        root={root}
        selectedItemId={selectedItemId}
        onSelect={(instanceId) => setSelectedItemId(instanceId)}
        renderItem={(props) => (
          <TreeItemBody {...props}>
            <TreeItemLabel>{props.itemData.id}</TreeItemLabel>
          </TreeItemBody>
        )}
        onDragEnd={(payload) => setRoot((root) => reparent(root, payload))}
        onDelete={() => null}
      />
    </Flex>
  );
};

export default {
  args: { animate: true },
} as ComponentMeta<typeof Tree>;
