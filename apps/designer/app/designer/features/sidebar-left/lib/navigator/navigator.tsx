import { Flex } from "@webstudio-is/design-system";
import { type Instance, type Publish } from "@webstudio-is/react-sdk";
import { useCallback } from "react";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { useRootInstance } from "~/shared/nano-states";
import { Header } from "../header";
import { InstanceTree } from "~/designer/shared/tree";

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
        <InstanceTree
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
