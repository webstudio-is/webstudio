import { useRef, useState } from "react";
import { Box, rawTheme } from "@webstudio-is/design-system";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import { $dragAndDropState, $isPreviewMode } from "~/shared/nano-states";
import { panels } from "./panels";
import { Flex } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { AiIcon, HelpIcon } from "@webstudio-is/icons";
import { HelpPopover } from "./help-popover";
import { useStore } from "@nanostores/react";
import {
  $activeSidebarPanel,
  setActiveSidebarPanel,
  toggleActiveSidebarPanel,
  type SidebarPanelName,
} from "~/builder/shared/nano-states";
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
import { getSetting, setSetting } from "~/builder/shared/client-settings";

const none = { TabContent: () => null };

const AiTabTrigger = () => {
  return (
    <SidebarButton
      label="AI"
      data-state={getSetting("isAiCommandBarVisible") ? "active" : undefined}
      onClick={() => {
        setSetting(
          "isAiCommandBarVisible",
          getSetting("isAiCommandBarVisible") ? false : true
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

type SidebarLeftProps = {
  publish: Publish;
};

export const SidebarLeft = ({ publish }: SidebarLeftProps) => {
  const activePanel = useStore($activeSidebarPanel);
  const dragAndDropState = useStore($dragAndDropState);
  const { TabContent } = panels.get(activePanel) ?? none;
  const isPreviewMode = useStore($isPreviewMode);
  const tabsWrapperRef = useRef<HTMLDivElement>(null);
  const returnTabRef = useRef<SidebarPanelName | undefined>(undefined);

  useSubscribe("dragEnd", () => {
    setActiveSidebarPanel("none");
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
        setActiveSidebarPanel(returnTabRef.current);
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

    returnTabRef.current = activePanel;
    // Save prevous state
    setActiveSidebarPanel("assets");
  });

  return (
    <Flex grow>
      <SidebarTabs
        activationMode="manual"
        value={activePanel}
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
                  ([panel, { Icon, label }]) => {
                    return (
                      <SidebarTabsTrigger
                        key={panel}
                        label={label}
                        value={panel}
                        onClick={() => {
                          toggleActiveSidebarPanel(panel);
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
            </Box>
          </>
        )}

        <SidebarTabsContent
          value={activePanel === "none" ? "" : activePanel}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setActiveSidebarPanel("none");
            }
          }}
          css={{
            width: theme.spacing[30],
            // We need the node to be rendered but hidden
            // to keep receiving the drag events.
            visibility:
              dragAndDropState.isDragging &&
              dragAndDropState.dragPayload?.origin === "panel" &&
              getSetting("navigatorLayout") !== "undocked"
                ? "hidden"
                : "visible",
          }}
        >
          <TabContent
            publish={publish}
            onSetActiveTab={setActiveSidebarPanel}
          />
        </SidebarTabsContent>
      </SidebarTabs>
    </Flex>
  );
};
