import { useState } from "react";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import {
  SidebarTabs,
  SidebarTabsContent,
  SidebarTabsList,
  SidebarTabsTrigger,
} from "@webstudio-is/design-system";
import { useDragAndDropState } from "~/shared/nano-states";
import { panels } from "./panels";
import type { TabName } from "./types";
import { isFeatureEnabled } from "~/shared/feature-flags";
import { useClientSettings } from "~/designer/shared/client-settings";
import { PANEL_WIDTH } from "~/designer/shared/constants";
import { Asset } from "@webstudio-is/asset-uploader";
import { Flex } from "@webstudio-is/design-system";

const none = { TabContent: () => null };

type SidebarLeftProps = {
  publish: Publish;
  assets?: Array<Asset>;
};

export const SidebarLeft = ({ publish, assets }: SidebarLeftProps) => {
  const [dragAndDropState] = useDragAndDropState();
  const [activeTab, setActiveTab] = useState<TabName>("none");
  const { TabContent } = activeTab === "none" ? none : panels[activeTab];
  const [clientSettings] = useClientSettings();

  useSubscribe("clickCanvas", () => {
    setActiveTab("none");
  });
  useSubscribe("dragEnd", () => {
    setActiveTab("none");
  });

  const enabledPanels = (Object.keys(panels) as Array<TabName>).filter(
    (panel) => {
      switch (panel) {
        case "assetManager":
          return isFeatureEnabled("assets");
        case "navigator":
          return clientSettings.navigatorLayout === "docked";
      }
      return true;
    }
  );

  return (
    <Flex>
      <SidebarTabs activationMode="manual" value={activeTab}>
        <SidebarTabsList>
          {enabledPanels.map((tabName: TabName) => (
            <SidebarTabsTrigger
              aria-label={tabName}
              key={tabName}
              value={tabName}
              onClick={() => {
                setActiveTab(activeTab !== tabName ? tabName : "none");
              }}
            >
              {tabName === "none" ? null : panels[tabName].icon}
            </SidebarTabsTrigger>
          ))}
        </SidebarTabsList>
        <SidebarTabsContent
          value={activeTab === "none" ? "" : activeTab}
          css={{
            width: PANEL_WIDTH,
            // We need the node to be rendered but hidden
            // to keep receiving the drag events.
            visibility:
              dragAndDropState.isDragging && dragAndDropState.origin === "panel"
                ? "hidden"
                : "visible",
            overflow: "auto",
          }}
        >
          <TabContent
            assets={assets || []}
            publish={publish}
            onSetActiveTab={setActiveTab}
          />
        </SidebarTabsContent>
      </SidebarTabs>
    </Flex>
  );
};
