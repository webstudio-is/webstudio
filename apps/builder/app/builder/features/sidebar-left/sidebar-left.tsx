import { useState } from "react";
import {
  Box,
  SidebarTabs,
  SidebarTabsContent,
  SidebarTabsList,
  SidebarTabsTrigger,
  Tooltip,
} from "@webstudio-is/design-system";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import {
  $dragAndDropState,
  $isAiCommandBarVisible,
} from "~/shared/nano-states";
import { panels } from "./panels";
import type { TabName } from "./types";
import { useClientSettings } from "~/builder/shared/client-settings";
import { Flex } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { AiIcon, BugIcon, HelpIcon } from "@webstudio-is/icons";
import { HelpPopover } from "./help-popover";
import { useStore } from "@nanostores/react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

const none = { TabContent: () => null };

type SidebarLeftProps = {
  publish: Publish;
};

export const SidebarLeft = ({ publish }: SidebarLeftProps) => {
  const dragAndDropState = useStore($dragAndDropState);
  const [activeTab, setActiveTab] = useState<TabName>("none");
  const { TabContent } = activeTab === "none" ? none : panels[activeTab];
  const [clientSettings] = useClientSettings();
  const [helpIsOpen, setHelpIsOpen] = useState(false);
  const isAiCommandBarVisible = useStore($isAiCommandBarVisible);

  useSubscribe("clickCanvas", () => {
    setActiveTab("none");
  });
  useSubscribe("dragEnd", () => {
    setActiveTab("none");
  });

  const enabledPanels = (Object.keys(panels) as Array<TabName>).filter(
    (panel) => {
      switch (panel) {
        case "navigator":
          return clientSettings.navigatorLayout === "docked";
      }
      return true;
    }
  );

  return (
    <Flex grow>
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
          {isFeatureEnabled("ai") && (
            <SidebarTabsTrigger
              aria-label="ai"
              value={isAiCommandBarVisible ? activeTab : "ai"}
              onClick={() => {
                $isAiCommandBarVisible.set(!isAiCommandBarVisible);
              }}
            >
              <AiIcon />
            </SidebarTabsTrigger>
          )}
        </SidebarTabsList>
        <Box css={{ borderRight: `1px solid  ${theme.colors.borderMain}` }}>
          <HelpPopover onOpenChange={setHelpIsOpen}>
            <Tooltip
              side="right"
              content="Learn Webstudio or ask for help"
              delayDuration={0}
            >
              <HelpPopover.Trigger asChild>
                <SidebarTabsTrigger
                  as="button"
                  aria-label="Ask for help"
                  data-state={helpIsOpen ? "active" : undefined}
                >
                  <HelpIcon size={22} />
                </SidebarTabsTrigger>
              </HelpPopover.Trigger>
            </Tooltip>
          </HelpPopover>

          <Tooltip
            side="right"
            content="Report a bug on Github"
            delayDuration={0}
          >
            <SidebarTabsTrigger
              as="button"
              aria-label="Report bug"
              onClick={() => {
                window.open(
                  "https://github.com/webstudio-is/webstudio-community/discussions/new?category=q-a&labels=bug&title=[Bug]"
                );
              }}
            >
              <BugIcon size={22} />
            </SidebarTabsTrigger>
          </Tooltip>
        </Box>

        <SidebarTabsContent
          value={activeTab === "none" ? "" : activeTab}
          css={{
            zIndex: theme.zIndices[1],
            width: theme.spacing[30],
            // We need the node to be rendered but hidden
            // to keep receiving the drag events.
            visibility:
              dragAndDropState.isDragging &&
              dragAndDropState.dragPayload?.origin === "panel"
                ? "hidden"
                : "visible",
          }}
        >
          <TabContent publish={publish} onSetActiveTab={setActiveTab} />
        </SidebarTabsContent>
      </SidebarTabs>
    </Flex>
  );
};
