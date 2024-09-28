import { NavigatorIcon } from "@webstudio-is/icons";
import { Kbd, Text, Flex, Separator } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton, Root } from "../../shared/panel";
import { CssPreview } from "./css-preview";
import { NavigatorTree } from "./navigator-tree";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  return (
    <Root>
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
