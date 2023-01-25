import { useCallback } from "react";
import { useStore } from "@nanostores/react";
import { Flex } from "@webstudio-is/design-system";
import { type Instance } from "@webstudio-is/react-sdk";
import { type Publish } from "~/shared/pubsub";
import {
  selectedInstanceIdStore,
  hoveredInstanceIdStore,
  useRootInstance,
} from "~/shared/nano-states";
import { Header, CloseButton } from "../header";
import { InstanceTree } from "~/designer/shared/tree";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    reparentInstance: {
      instanceId: Instance["id"];
      dropTarget: { instanceId: Instance["id"]; position: number | "end" };
    };
    deleteInstance: { id: Instance["id"] };
  }
}

type NavigatorProps = {
  publish: Publish;
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ publish, isClosable, onClose }: NavigatorProps) => {
  const selectedInstanceId = useStore(selectedInstanceIdStore);
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

  const handleHover = useCallback((instance: Instance | undefined) => {
    hoveredInstanceIdStore.set(instance?.id);
  }, []);

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
          selectedItemId={selectedInstanceId}
          onSelect={handleSelect}
          onHover={handleHover}
          onDragEnd={handleDragEnd}
          onDelete={handleDelete}
        />
      </Flex>
    </Flex>
  );
};
