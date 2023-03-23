import { Flex } from "@webstudio-is/design-system";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import { Header, CloseButton } from "../header";

type NavigatorProps = {
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ isClosable, onClose }: NavigatorProps) => {
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
