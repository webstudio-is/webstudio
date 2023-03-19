import { useCallback } from "react";
import { useStore } from "@nanostores/react";
import { Flex } from "@webstudio-is/design-system";
import {
  rootInstanceStore,
  selectedInstanceSelectorStore,
  hoveredInstanceSelectorStore,
} from "~/shared/nano-states";
import { InstanceTree } from "~/builder/shared/tree";
import { reparentInstance } from "~/shared/instance-utils";
import type { InstanceSelector } from "~/shared/tree-utils";
import { Header, CloseButton } from "../header";

type NavigatorProps = {
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ isClosable, onClose }: NavigatorProps) => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const rootInstance = useStore(rootInstanceStore);

  const handleDragEnd = useCallback(
    (payload: {
      itemSelector: InstanceSelector;
      dropTarget: { itemSelector: InstanceSelector; position: number | "end" };
    }) => {
      reparentInstance(payload.itemSelector[0], {
        parentId: payload.dropTarget.itemSelector[0],
        position: payload.dropTarget.position,
      });
    },
    []
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
          selectedItemSelector={selectedInstanceSelector}
          onSelect={selectedInstanceSelectorStore.set}
          onHover={hoveredInstanceSelectorStore.set}
          onDragEnd={handleDragEnd}
        />
      </Flex>
    </Flex>
  );
};
