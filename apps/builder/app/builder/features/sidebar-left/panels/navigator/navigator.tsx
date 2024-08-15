import { NavigatorIcon } from "@webstudio-is/icons";
import { NavigatorContent } from "./navigator-content";
import type { TabContentProps } from "../../types";
import { Kbd, Text } from "@webstudio-is/design-system";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  return (
    <NavigatorContent
      onClose={() => {
        onSetActiveTab("none");
      }}
    />
  );
};

export const Icon = NavigatorIcon;

export const label = (
  <Text>
    Navigator&nbsp;&nbsp;
    <Kbd value={["z"]} color="moreSubtle" />
  </Text>
);
