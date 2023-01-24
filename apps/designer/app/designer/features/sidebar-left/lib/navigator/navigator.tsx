import { Flex } from "@webstudio-is/design-system";
import { type Instance } from "@webstudio-is/react-sdk";
import { type Publish } from "~/shared/pubsub";
import { useCallback } from "react";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { selectedInstanceIdStore, useRootInstance } from "~/shared/nano-states";
import { Header, CloseButton } from "../header";
import { InstanceTree } from "~/designer/shared/tree";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    reparentInstance: {
      instanceId: Instance["id"];
      dropTarget: { instanceId: Instance["id"]; position: number | "end" };
    };
    deleteInstance: { id: Instance["id"] };
    navigatorHoveredInstance: { id: Instance["id"] } | undefined;
  }
}

type NavigatorProps = {
  publish: Publish;
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ publish, isClosable, onClose }: NavigatorProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const [rootInstance] = useRootInstance();

  const handleSelect = useCallback((instanceId: Instance["id"]) => {
    selectedInstanceIdStore.set(instanceId);
  }, []);

  const handleDragEnd = useCallback(
    (payload: {
      itemId: string;
      dropTarget: { itemId: string; position: number | "end" };
    }) => {
      publish({
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
      publish({
        type: "deleteInstance",
        payload: { id: instanceId },
      });
    },
    [publish]
  );

  const handleHover = useCallback(
    (instance: Instance | undefined) => {
      publish({
        type: "navigatorHoveredInstance",
        payload: instance && { id: instance.id },
      });
    },
    [publish]
  );

  if (rootInstance === undefined) {
    return null;
  }
  return (
    <Flex css={{ height: "100%", flexDirection: "column" }}>
      <Header
        title="Navigator"
        suffix={isClosable && <CloseButton onClick={() => onClose?.()} />}
      />
      <Flex css={{ flexGrow: 1, flexDirection: "column" }}>
        <InstanceTree
          root={rootInstance}
          selectedItemId={selectedInstanceData?.id}
          onSelect={handleSelect}
          onHover={handleHover}
          onDragEnd={handleDragEnd}
          onDelete={handleDelete}
        />
      </Flex>
    </Flex>
  );
};
