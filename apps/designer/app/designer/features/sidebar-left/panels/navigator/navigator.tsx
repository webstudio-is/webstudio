import { type Publish } from "@webstudio-is/react-sdk";
import { ListNestedIcon } from "@webstudio-is/icons";
import { Navigator } from "../../navigator";
import { TabName } from "../../types";

type TabContentProps = {
  publish: Publish;
  onSetActiveTab: (tabName: TabName) => void;
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  return (
    <Navigator
      publish={publish}
      onClose={() => {
        onSetActiveTab("none");
      }}
    />
  );
};

export const icon = <ListNestedIcon />;
