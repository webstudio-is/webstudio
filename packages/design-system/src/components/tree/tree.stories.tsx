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
import { TreeNodeLabel } from "./tree-node";

export const StressTest = ({ animate }: { animate: boolean }) => {
  const [root, setRoot] = useState<Item>((): Item => {
    return {
      id: "root",
      canAcceptChildren: true,
      children: Array.from(
        { length: 100 },
        (_, i): Item => ({
          id: `box-${i}`,
          canAcceptChildren: true,
          children: [
            { id: `heading-${i}.0`, canAcceptChildren: false, children: [] },
            { id: `paragraph-${i}.0`, canAcceptChildren: false, children: [] },
            {
              id: `box-${i}.0`,
              canAcceptChildren: true,
              children: [
                {
                  id: `box-${i}.0.0`,
                  canAcceptChildren: true,
                  children: [
                    {
                      id: `box-${i}.0.0.0`,
                      canAcceptChildren: true,
                      children: [
                        {
                          id: `heading-${i}.1`,
                          canAcceptChildren: false,
                          children: [],
                        },
                        {
                          id: `paragraph-${i}.1`,
                          canAcceptChildren: false,
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                { id: `box-${i}.0.1`, canAcceptChildren: true, children: [] },
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
        renderItem={({ data, isSelected }) => (
          <TreeNodeLabel text={data.id} isSelected={isSelected} />
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
