import { useState } from "react";
import { Box, Tooltip } from "@webstudio-is/design-system";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import { $dragAndDropState } from "~/shared/nano-states";
import { panels } from "./panels";
import type { TabName } from "./types";
import { useClientSettings } from "~/builder/shared/client-settings";
import { Flex } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { AiIcon, BugIcon, HelpIcon } from "@webstudio-is/icons";
import { HelpPopover } from "./help-popover";
import { useStore } from "@nanostores/react";
import { $activeSidebarPanel } from "~/builder/shared/nano-states";
import {
  SidebarTabs,
  SidebarTabsContent,
  SidebarTabsList,
  SidebarTabsTrigger,
} from "./sidebar-tabs";

const none = { TabContent: () => null };

const useActiveTab = () => {
  const activeTab = useStore($activeSidebarPanel);
  const [clientSettings] = useClientSettings();
  let nextTab = activeTab;
  if (
    nextTab === "navigator" &&
    clientSettings.navigatorLayout === "undocked"
  ) {
    nextTab = "none";
  }
  return [nextTab, $activeSidebarPanel.set] as const;
};

type SidebarLeftProps = {
  publish: Publish;
};

export const SidebarLeft = ({ publish }: SidebarLeftProps) => {
  const [activeTab, setActiveTab] = useActiveTab();
  const dragAndDropState = useStore($dragAndDropState);
  const [helpIsOpen, setHelpIsOpen] = useState(false);
  const [clientSettings, setClientSetting] = useClientSettings();
  const { TabContent } = activeTab === "none" ? none : panels[activeTab];

  useSubscribe("dragEnd", () => {
    setActiveTab("none");
  });

  return (
    <Flex grow>
      <SidebarTabs
        activationMode="manual"
        value={activeTab}
        orientation="vertical"
      >
        <SidebarTabsList>
          {(Object.keys(panels) as Array<TabName>).map((tabName: TabName) => (
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
          <SidebarTabsTrigger
            aria-label="ai"
            value={
              "anyValueNotInTabName" /* !!! This button does not have active state, use impossible tab value  !!! */
            }
            onClick={() => {
              setClientSetting(
                "isAiCommandBarVisible",
                clientSettings.isAiCommandBarVisible === true ? false : true
              );
            }}
          >
            <AiIcon />
          </SidebarTabsTrigger>
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
