import { Flex, Separator } from "@webstudio-is/design-system";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import { Header, CloseButton } from "../header";
import { CssPreview } from "./css-preview";
import { useHotkeys } from "react-hotkeys-hook";
import { emitCommand } from "~/builder/shared/commands";

type NavigatorProps = {
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ isClosable, onClose }: NavigatorProps) => {
  const shortcutRef = useHotkeys<HTMLDivElement>(
    "enter",
    () => emitCommand("editInstanceText"),
    []
  );

  return (
    <Flex ref={shortcutRef} css={{ height: "100%", flexDirection: "column" }}>
      <Header
        title="Navigator"
        suffix={isClosable && <CloseButton onClick={() => onClose?.()} />}
      />
      <Flex grow direction="column" justify="end">
        <NavigatorTree />
        <Separator />
        <CssPreview />
      </Flex>
    </Flex>
  );
};
