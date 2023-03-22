import { useStore } from "@nanostores/react";
import { Flex } from "@webstudio-is/design-system";
import { rootInstanceStore } from "~/shared/nano-states";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import { Header, CloseButton } from "../header";

type NavigatorProps = {
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ isClosable, onClose }: NavigatorProps) => {
  const rootInstance = useStore(rootInstanceStore);

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
        <NavigatorTree />
      </Flex>
    </Flex>
  );
};
