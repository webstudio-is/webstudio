import { useEffect, useRef, useState } from "react";
import { Box, rawTheme } from "@webstudio-is/design-system";
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
  SidebarButton,
  SidebarTabs,
  SidebarTabsContent,
  SidebarTabsList,
  SidebarTabsTrigger,
} from "./sidebar-tabs";
import {
  ExternalDragDropMonitor,
  POTENTIAL,
  isBlockedByBackdrop,
  useOnDropEffect,
  useExternalDragStateEffect,
} from "~/builder/shared/assets/drag-monitor";
import type { TabName } from "./types";

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

const useHideActiveTabOnPreview = () => {
  useEffect(() => {
    return $isPreviewMode.subscribe((isPreviewMode) => {
      // When user switches to preview mode we want to hide any active sidebar panel.
      if (isPreviewMode) {
        $activeSidebarPanel.set("none");
      }
    });
  }, []);
};

const AiTabTrigger = () => {
  const [clientSettings, setClientSetting] = useClientSettings();
  return (
    <SidebarButton
      label="AI"
      data-state={clientSettings.isAiCommandBarVisible ? "active" : undefined}
      onClick={() => {
        setClientSetting(
          "isAiCommandBarVisible",
          clientSettings.isAiCommandBarVisible ? false : true
        );
      }}
    >
      <AiIcon size={rawTheme.spacing[10]} />
    </SidebarButton>
  );
};

const HelpTabTrigger = () => {
  const [helpIsOpen, setHelpIsOpen] = useState(false);
  return (
    <HelpPopover onOpenChange={setHelpIsOpen}>
      <HelpPopover.Trigger asChild>
        <SidebarButton
          label="Learn Webstudio or ask for help"
          data-state={helpIsOpen ? "active" : undefined}
        >
          <HelpIcon size={rawTheme.spacing[10]} />
        </SidebarButton>
      </HelpPopover.Trigger>
    </HelpPopover>
  );
};

const GithubTabTrigger = () => {
  return (
    <SidebarButton
      label="Report a bug on Github"
      onClick={() => {
        window.open(
          "https://github.com/webstudio-is/webstudio-community/discussions/new?category=q-a&labels=bug&title=[Bug]"
        );
      }}
    >
      <BugIcon size={rawTheme.spacing[10]} />
    </SidebarButton>
  );
};

type SidebarLeftProps = {
  publish: Publish;
};

export const SidebarLeft = ({ publish }: SidebarLeftProps) => {
  const [activeTab, setActiveTab] = useActiveTab();
  useHideActiveTabOnPreview();
  const dragAndDropState = useStore($dragAndDropState);
  const { TabContent } = panels.get(activeTab) ?? none;
  const isPreviewMode = useStore($isPreviewMode);
  const tabsWrapperRef = useRef<HTMLDivElement>(null);

  const returnTabRef = useRef<TabName | undefined>(undefined);

  useSubscribe("dragEnd", () => {
    setActiveTab("none");
  });

  useOnDropEffect(() => {
    const element = tabsWrapperRef.current;

    if (element == null) {
      return;
    }

    if (isBlockedByBackdrop(element)) {
      return;
    }

    returnTabRef.current = undefined;
  });

  useExternalDragStateEffect((state) => {
    if (state !== POTENTIAL) {
      if (returnTabRef.current !== undefined) {
        setActiveTab(returnTabRef.current);
      }
      returnTabRef.current = undefined;
      return;
    }

    const element = tabsWrapperRef.current;

    if (element == null) {
      return;
    }

    if (isBlockedByBackdrop(element)) {
      return;
    }

    returnTabRef.current = activeTab;
    // Save prevous state
    setActiveTab("assets");
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
            <ExternalDragDropMonitor />
            <div ref={tabsWrapperRef} style={{ display: "contents" }}>
              <SidebarTabsList>
                {Array.from(panels.entries()).map(
                  ([tabName, { Icon, label }]) => {
                    return (
                      <SidebarTabsTrigger
                        key={label}
                        label={label}
                        value={tabName}
                        onClick={() => {
                          setActiveTab(
                            activeTab === tabName ? "none" : tabName
                          );
                        }}
                      >
                        <Icon size={rawTheme.spacing[10]} />
                      </SidebarTabsTrigger>
                    );
                  }
                )}
              </SidebarTabsList>
            </div>

            <Box css={{ borderRight: `1px solid ${theme.colors.borderMain}` }}>
              <AiTabTrigger />
              <HelpTabTrigger />
              <GithubTabTrigger />
            </Box>
          </>
        )}

        <SidebarTabsContent
          value={activeTab === "none" ? "" : activeTab}
          css={{
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
