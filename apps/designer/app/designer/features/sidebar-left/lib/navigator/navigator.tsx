import { Flex, Tree, TreeNodeLabel } from "@webstudio-is/design-system";
import {
  type Instance,
  type Publish,
  components,
} from "@webstudio-is/react-sdk";
import { useCallback } from "react";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { useRootInstance } from "~/shared/nano-states";
import {
  findInstanceById,
  getInstancePath,
  getInstancePathWithPositions,
} from "~/shared/tree-utils";
import { Header } from "../header";

const tmp = {
  findItemById: findInstanceById,
  getItemPath: getInstancePath,
  getItemPathWithPositions: getInstancePathWithPositions,
  canBeReparented(item: Instance) {
    return components[item.component].isInlineOnly !== true;
  },
  canAcceptChild(item: Instance) {
    return components[item.component].canAcceptChildren;
  },
  getItemChildren(item: Instance) {
    return item.children.filter(
      (child) => typeof child !== "string"
    ) as Instance[];
  },
  renderItem(props: { data: Instance; isSelected: boolean }) {
    const { Icon, label } = components[props.data.component];
    return (
      <>
        <Icon />
        <TreeNodeLabel isSelected={props.isSelected} text={label} withIcon />
      </>
    );
  },
};

type NavigatorProps = {
  publish: Publish;
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ publish, isClosable, onClose }: NavigatorProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const [rootInstance] = useRootInstance();

  const handleSelect = useCallback(
    (instanceId: Instance["id"]) => {
      publish<"selectInstanceById", Instance["id"]>({
        type: "selectInstanceById",
        payload: instanceId,
      });
    },
    [publish]
  );

  type ReparentInstancePayload = {
    instanceId: Instance["id"];
    dropTarget: { instanceId: Instance["id"]; position: number | "end" };
  };
  const handleDragEnd = useCallback(
    (payload: {
      itemId: string;
      dropTarget: { itemId: string; position: number | "end" };
    }) => {
      publish<"reparentInstance", ReparentInstancePayload>({
        type: "reparentInstance",
        payload: {
          instanceId: payload.itemId,
          dropTarget: {
            instanceId: payload.dropTarget.itemId,
            position: payload.dropTarget.position,
          },
        },
      });
    },
    [publish]
  );

  const handleDelete = useCallback(
    (instanceId: Instance["id"]) => {
      publish<"deleteInstance", { id: Instance["id"] }>({
        type: "deleteInstance",
        payload: { id: instanceId },
      });
    },
    [publish]
  );

  if (rootInstance === undefined) return null;
  return (
    <Flex css={{ height: "100%", flexDirection: "column" }}>
      <Header title="Navigator" onClose={onClose} isClosable={isClosable} />
      <Flex css={{ flexGrow: 1, flexDirection: "column" }}>
        <Tree
          {...tmp}
          root={rootInstance}
          selectedItemId={selectedInstanceData?.id}
          onSelect={handleSelect}
          onDragEnd={handleDragEnd}
          onDelete={handleDelete}
        />
      </Flex>
    </Flex>
  );
};
