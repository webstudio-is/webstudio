import { ListNestedIcon } from "@webstudio-is/icons";
import { Navigator, useNavigatorLayout } from "../../navigator";
import type { TabName } from "../../types";
import { useEffect } from "react";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
};

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const navigatorLayout = useNavigatorLayout();

  useEffect(() => {
    // When user switches to undocked navigator mode, we need to close the tab.
    if (navigatorLayout === "undocked") {
      onSetActiveTab("none");
    }
  }, [navigatorLayout, onSetActiveTab]);

  return (
    <Navigator
      onClose={() => {
        onSetActiveTab("none");
      }}
    />
  );
};

export const icon = <ListNestedIcon />;
