import type { ComponentMeta } from "@storybook/react";
import { useState } from "react";
import { Tree } from "./tree";
import { type Item, findItemById, reparent } from "./test-tree-data";
import { Flex } from "../flex";
import { TreeItemLabel, TreeItemBody } from "./tree-node";
import type { ItemDropTarget, ItemSelector } from "./item-utils";

export const StressTest = () => {
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
                  id: `hidden-${index}.0.0`,
                  canAcceptChildren: true,
                  isHidden: true,
                  children: [
                    {
                      id: `box-${index}.0.0.0`,
                      canAcceptChildren: true,
                      children: [
                        {
                          id: `box-${index}.0.0.0.0`,
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

  const [selectedItemSelector, setSelectedItemSelector] = useState<
    undefined | ItemSelector
  >();
  const [dropTarget, setDropTarget] = useState<undefined | ItemDropTarget>();
  const [dragItemSelector, setDragItemSelector] = useState<
    undefined | ItemSelector
  >();

  return (
    <Flex css={{ width: 300, height: 500, flexDirection: "column" }}>
      <Tree
        editingItemId={undefined}
        findClosestDroppableIndex={(itemSelector) => {
          return itemSelector.findIndex((itemId) => {
            const item = findItemById(root, itemId);
            return (
              (item?.canAcceptChildren ?? false) &&
              (item?.isHidden ?? false) === false
            );
          });
        }}
        canLeaveParent={() => true}
        getItemChildren={(itemId) => findItemById(root, itemId)?.children ?? []}
        isItemHidden={(itemSelector) =>
          findItemById(root, itemSelector[0])?.isHidden ?? false
        }
        root={root}
        selectedItemSelector={selectedItemSelector}
        dragItemSelector={dragItemSelector}
        dropTarget={dropTarget}
        onSelect={setSelectedItemSelector}
        onDropTargetChange={setDropTarget}
        onDragItemChange={setDragItemSelector}
        renderItem={(props) => (
          <TreeItemBody {...props}>
            <TreeItemLabel>{props.itemData.id}</TreeItemLabel>
          </TreeItemBody>
        )}
        onDragEnd={(payload) => {
          setRoot((root) => reparent(root, payload));
          setDragItemSelector(undefined);
          setDropTarget(undefined);
        }}
        onCancel={() => {
          setDragItemSelector(undefined);
          setDropTarget(undefined);
        }}
      />
    </Flex>
  );
};

export default {
  component: Tree,
} as ComponentMeta<typeof Tree>;
