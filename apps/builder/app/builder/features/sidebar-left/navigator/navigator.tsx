import { Flex } from "@webstudio-is/design-system";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import { Header, CloseButton } from "../header";
import type { Publish } from "~/shared/pubsub";
import { usePublishInstanceTreeShortcuts } from "~/builder/shared/shortcuts";

type NavigatorProps = {
  isClosable?: boolean;
  onClose?: () => void;
  publish: Publish;
};

export const Navigator = ({ isClosable, onClose, publish }: NavigatorProps) => {
  const shortcutRef = usePublishInstanceTreeShortcuts<HTMLDivElement>(publish);

  return (
    <Flex ref={shortcutRef} css={{ height: "100%", flexDirection: "column" }}>
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
