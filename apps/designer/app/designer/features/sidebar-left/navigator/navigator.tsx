import { useCallback } from "react";
import { useStore } from "@nanostores/react";
import store from "immerhin";
import { Flex } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import {
  selectedInstanceIdStore,
  hoveredInstanceIdStore,
  useRootInstance,
  rootInstanceContainer,
} from "~/shared/nano-states";
import {
  createInstancesIndex,
  reparentInstanceMutable,
} from "~/shared/tree-utils";
import { InstanceTree } from "~/designer/shared/tree";
import { Header, CloseButton } from "../header";

type NavigatorProps = {
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ isClosable, onClose }: NavigatorProps) => {
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
      store.createTransaction([rootInstanceContainer], (rootInstance) => {
        const instancesIndex = createInstancesIndex(rootInstance);
        reparentInstanceMutable(instancesIndex, payload.itemId, {
          parentId: payload.dropTarget.itemId,
          position: payload.dropTarget.position,
        });
      });
    },
    []
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
        />
      </Flex>
    </Flex>
  );
};
