import { Flex } from "@webstudio-is/design-system";
import type { Instance, Publish } from "@webstudio-is/react-sdk";
import { useCallback } from "react";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { Tree } from "~/designer/shared/tree";
import { useRootInstance } from "~/shared/nano-states";
import { Header } from "../header";

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
    (payload: ReparentInstancePayload) => {
      publish<"reparentInstance", ReparentInstancePayload>({
        type: "reparentInstance",
        payload,
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
          root={rootInstance}
          selectedInstanceId={selectedInstanceData?.id}
          onSelect={handleSelect}
          onDragEnd={handleDragEnd}
          onDelete={handleDelete}
        />
      </Flex>
    </Flex>
  );
};
