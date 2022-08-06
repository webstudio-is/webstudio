import { useState } from "react";
import { useSubscribe, type Publish } from "@webstudio-is/react-sdk";
import type { Asset } from "@webstudio-is/prisma-client";
import {
  Box,
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

const none = { TabContent: () => null };

type SidebarLeftProps = {
  publish: Publish;
  assets: Array<Asset>;
};

export const SidebarLeft = ({ publish, assets }: SidebarLeftProps) => {
  const [dragAndDropState] = useDragAndDropState();
  const [activeTab, setActiveTab] = useState<TabName>("none");
  const { TabContent } = activeTab === "none" ? none : panels[activeTab];
  const [clientSettings] = useClientSettings();

  useSubscribe<"clickCanvas">("clickCanvas", () => {
    setActiveTab("none");
  });
  useSubscribe<"dragEnd">("dragEnd", () => {
    setActiveTab("none");
  });

  const enabledPanels = (Object.keys(panels) as Array<TabName>).filter(
    (panel) => {
      switch (panel) {
        case "assetManager":
          return isFeatureEnabled("assets");
        case "navigator":
          return clientSettings.navigatorLayout === "attached";
      }
      return true;
    }
  );

  return (
    <Box css={{ position: "relative", zIndex: 1 }}>
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
            assets={assets}
            publish={publish}
            onSetActiveTab={setActiveTab}
          />
        </SidebarTabsContent>
      </SidebarTabs>
    </Box>
  );
};
