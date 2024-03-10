import { NavigatorIcon } from "@webstudio-is/icons";
import { NavigatorContent } from "./navigator-content";
import type { TabContentProps } from "../../types";

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

export const label = "Navigator";
