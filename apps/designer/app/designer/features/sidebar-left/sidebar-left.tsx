import { useState, useCallback } from "react";
import { useSubscribe, type Publish } from "@webstudio-is/react-sdk";
import {
  Box,
  SidebarTabs,
  SidebarTabsContent,
  SidebarTabsList,
  SidebarTabsTrigger,
} from "~/shared/design-system";
import { useSelectedInstanceData } from "../../shared/nano-states";
import { panels } from "./panels";
import type { TabName } from "./types";
import { Asset } from "@prisma/client";
import { isFeatureEnabled } from "~/shared/feature-flags";

const sidebarTabsContentStyle = {
  position: "absolute",
  left: "100%",
  width: 250,
  height: "100%",
  bc: "$loContrast",
  // @todo: focus state should be same as hover/active state: hover and focus yes, probably same, active? not so sure.
  outline: "none",
};

const none = { TabContent: () => null };

type SidebarLeftProps = {
  onDragChange: (isDragging: boolean) => void;
  publish: Publish;
  assets: Array<Asset>;
};

export const SidebarLeft = ({
  onDragChange,
  publish,
  assets,
}: SidebarLeftProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();
  const [activeTab, setActiveTab] = useState<TabName>("none");
  const [isDragging, setIsDragging] = useState(false);
  const { TabContent } = activeTab === "none" ? none : panels[activeTab];

  useSubscribe<"clickCanvas">("clickCanvas", () => {
    setActiveTab("none");
  });
  useSubscribe("dragStartInstance", () => {
    setIsDragging(true);
  });
  useSubscribe("dragEndInstance", () => {
    setIsDragging(false);
  });

  const handleDragChange = useCallback(
    (isDragging: boolean) => {
      // After dragging is done, container is going to become visible
      // and we need to close it for good.
      if (isDragging === false) setActiveTab("none");
      setIsDragging(isDragging);
      onDragChange(isDragging);
    },
    [onDragChange]
  );

  const panelsToMap = (
    isFeatureEnabled("assets")
      ? Object.keys(panels)
      : Object.keys(panels).filter((panel) => panel !== "imageUpload")
  ) as Array<TabName>;

  return (
    <Box css={{ position: "relative", zIndex: 1 }}>
      <SidebarTabs activationMode="manual" value={activeTab}>
        <SidebarTabsList>
          {panelsToMap.map((tabName: TabName) => (
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
            ...sidebarTabsContentStyle,
            // We need the node to be rendered but hidden
            // to keep receiving the drag events.
            visibility: isDragging ? "hidden" : "visible",
            overflow: "auto",
          }}
        >
          <TabContent
            assets={assets}
            selectedInstanceData={selectedInstanceData}
            publish={publish}
            onSetActiveTab={setActiveTab}
            onDragChange={handleDragChange}
          />
        </SidebarTabsContent>
      </SidebarTabs>
    </Box>
  );
};
