import { NavigatorIcon } from "@webstudio-is/icons";
import { Kbd, Text, Flex, Separator } from "@webstudio-is/design-system";
import { useHotkeys } from "react-hotkeys-hook";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import { emitCommand } from "~/builder/shared/commands";
import type { TabContentProps } from "../../types";
import { Header, CloseButton, Root } from "../../shared/panel";
import { CssPreview } from "./css-preview";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const shortcutRef = useHotkeys<HTMLDivElement>(
    "enter",
    () => emitCommand("editInstanceText"),
    []
  );

  return (
    <Root ref={shortcutRef}>
      <Header
        title="Navigator"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <Flex grow direction="column" justify="end">
        <NavigatorTree />
        <Separator />
        <CssPreview />
      </Flex>
    </Root>
  );
};

export const Icon = NavigatorIcon;

export const label = (
  <Text>
    Navigator&nbsp;&nbsp;
    <Kbd value={["z"]} color="moreSubtle" />
  </Text>
);
