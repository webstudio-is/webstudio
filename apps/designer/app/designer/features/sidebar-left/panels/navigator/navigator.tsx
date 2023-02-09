import { ListNestedIcon } from "@webstudio-is/icons";
import { Navigator } from "../../navigator";
import { TabName } from "../../types";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
};

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
