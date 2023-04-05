import { ListNestedIcon } from "@webstudio-is/icons";
import { Navigator } from "../../navigator";
import type { TabName } from "../../types";
import type { Publish } from "~/shared/pubsub";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({ onSetActiveTab, publish }: TabContentProps) => {
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
