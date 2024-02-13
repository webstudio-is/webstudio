import { ListNestedIcon } from "@webstudio-is/icons";
import { Navigator } from "../../navigator";
import type { TabContentProps } from "../../types";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  return (
    <Navigator
      onClose={() => {
        onSetActiveTab("none");
      }}
    />
  );
};

export const icon = <ListNestedIcon />;
