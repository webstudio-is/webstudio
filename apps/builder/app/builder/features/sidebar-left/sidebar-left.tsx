import { useState } from "react";
import { Box, Tooltip, rawTheme } from "@webstudio-is/design-system";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import { $dragAndDropState, $isPreviewMode } from "~/shared/nano-states";
import { panels } from "./panels";
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

const AiTabTrigger = () => {
  const [clientSettings, setClientSetting] = useClientSettings();
  return (
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
      <AiIcon size={rawTheme.spacing[10]} />
    </SidebarTabsTrigger>
  );
};

const HelpTabTrigger = () => {
  const [helpIsOpen, setHelpIsOpen] = useState(false);
  return (
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
            <HelpIcon size={rawTheme.spacing[10]} />
          </SidebarTabsTrigger>
        </HelpPopover.Trigger>
      </Tooltip>
    </HelpPopover>
  );
};

const GithubTabTrigger = () => {
  return (
    <Tooltip side="right" content="Report a bug on Github" delayDuration={0}>
      <SidebarTabsTrigger
        as="button"
        aria-label="Report bug"
        onClick={() => {
          window.open(
            "https://github.com/webstudio-is/webstudio-community/discussions/new?category=q-a&labels=bug&title=[Bug]"
          );
        }}
      >
        <BugIcon size={rawTheme.spacing[10]} />
      </SidebarTabsTrigger>
    </Tooltip>
  );
};

type SidebarLeftProps = {
  publish: Publish;
};

export const SidebarLeft = ({ publish }: SidebarLeftProps) => {
  const [activeTab, setActiveTab] = useActiveTab();
  const dragAndDropState = useStore($dragAndDropState);
  const { TabContent } = panels.get(activeTab) ?? none;
  const isPreviewMode = useStore($isPreviewMode);

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
        {
          // In preview mode, we don't show left sidebar, but we want to allow pages panel to be open in the preview mode.
          // This way user can switch pages without exiting preview mode.
        }
        {isPreviewMode === false && (
          <>
            <SidebarTabsList>
              {Array.from(panels.entries()).map(([tabName, { Icon }]) => {
                return (
                  <SidebarTabsTrigger
                    key={tabName}
                    aria-label={tabName}
                    value={tabName}
                    onClick={() => {
                      setActiveTab(activeTab === tabName ? "none" : tabName);
                    }}
                  >
                    <Icon size={rawTheme.spacing[10]} />
                  </SidebarTabsTrigger>
                );
              })}
              <AiTabTrigger />
            </SidebarTabsList>
            <Box css={{ borderRight: `1px solid  ${theme.colors.borderMain}` }}>
              <HelpTabTrigger />
              <GithubTabTrigger />
            </Box>
          </>
        )}

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
