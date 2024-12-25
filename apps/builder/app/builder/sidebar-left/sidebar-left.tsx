import { useRef, useState, type ReactNode } from "react";
import { Kbd, rawTheme, Text } from "@webstudio-is/design-system";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import {
  $dragAndDropState,
  $isContentMode,
  $isDesignMode,
  $isPreviewMode,
} from "~/shared/nano-states";
import { Flex } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import {
  AiIcon,
  ExtensionIcon,
  HelpIcon,
  ImageIcon,
  NavigatorIcon,
  PageIcon,
  PlusIcon,
  type IconComponent,
} from "@webstudio-is/icons";
import { HelpCenter } from "../features/help/help-center";
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
import { ComponentsPanel } from "~/builder/features/components";
import { PagesPanel } from "~/builder/features/pages";
import { NavigatorPanel } from "~/builder/features/navigator";
import { AssetsPanel } from "~/builder/features/assets";
import { MarketplacePanel } from "~/builder/features/marketplace";

const none = { Panel: () => null };

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
    <HelpCenter onOpenChange={setHelpIsOpen}>
      <HelpCenter.Trigger asChild>
        <SidebarButton
          label="Learn Webstudio or ask for help"
          data-state={helpIsOpen ? "active" : undefined}
        >
          <HelpIcon size={rawTheme.spacing[10]} />
        </SidebarButton>
      </HelpCenter.Trigger>
    </HelpCenter>
  );
};

type PanelConfig = {
  name: SidebarPanelName;
  label: ReactNode;
  Icon: IconComponent;
  Panel: (props: { publish: Publish; onClose: () => void }) => ReactNode;
  visibility?: {
    content?: boolean; // if set, controls visibility in edit mode, if not the panel is visible
    // Probably other modes
  };
};

const isPanelVisible = (
  panel: Pick<PanelConfig, "visibility">,
  {
    isPreviewMode,
    isContentMode,
  }: { isPreviewMode: boolean; isContentMode: boolean }
) => {
  if (isPreviewMode) {
    return false;
  }

  const { visibility } = panel;

  // If visibility is not defined, the panel is always visible
  if (visibility === undefined) {
    return true;
  }

  if (isContentMode) {
    // If visibility.edit is not defined, the panel is visible
    return visibility.content ?? true;
  }

  return true;
};

const panels: PanelConfig[] = [
  {
    name: "components",
    label: (
      <Text>
        Components&nbsp;&nbsp;
        <Kbd value={["A"]} color="moreSubtle" />
      </Text>
    ),
    Icon: PlusIcon,
    Panel: ComponentsPanel,
    visibility: {
      content: false,
    },
  },
  {
    name: "pages",
    label: "Pages",
    Icon: PageIcon,
    Panel: PagesPanel,
  },
  {
    name: "navigator",
    label: (
      <Text>
        Navigator&nbsp;&nbsp;
        <Kbd value={["z"]} color="moreSubtle" />
      </Text>
    ),
    Icon: NavigatorIcon,
    Panel: NavigatorPanel,
  },
  {
    name: "assets",
    label: "Assets",
    Icon: ImageIcon,
    Panel: AssetsPanel,
  },
  {
    name: "marketplace",
    label: "Marketplace",
    Icon: ExtensionIcon,
    Panel: MarketplacePanel,
    visibility: {
      content: false,
    },
  },
];

type SidebarLeftProps = {
  publish: Publish;
};

export const SidebarLeft = ({ publish }: SidebarLeftProps) => {
  const isDesignMode = useStore($isDesignMode);
  const activePanel = useStore($activeSidebarPanel);
  const dragAndDropState = useStore($dragAndDropState);
  const { Panel } = panels.find((item) => item.name === activePanel) ?? none;
  const isPreviewMode = useStore($isPreviewMode);
  const isContentMode = useStore($isContentMode);
  const tabsWrapperRef = useRef<HTMLDivElement>(null);
  const returnTabRef = useRef<SidebarPanelName | undefined>(undefined);

  useSubscribe("dragEnd", () => {
    setActiveSidebarPanel("auto");
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

  const modes = { isContentMode, isPreviewMode };

  return (
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
        <Flex
          grow
          direction="column"
          css={{ borderRight: `1px solid ${theme.colors.borderMain}` }}
        >
          <ExternalDragDropMonitor />
          <div ref={tabsWrapperRef} style={{ display: "contents" }}>
            <SidebarTabsList>
              {panels
                .filter((panel) => isPanelVisible(panel, modes))
                .map(({ name, Icon, label }) => {
                  return (
                    <SidebarTabsTrigger
                      key={name}
                      label={label}
                      value={name}
                      onClick={() => {
                        toggleActiveSidebarPanel(name);
                      }}
                    >
                      <Icon size={rawTheme.spacing[10]} />
                    </SidebarTabsTrigger>
                  );
                })}
            </SidebarTabsList>
          </div>
          {isDesignMode && <AiTabTrigger />}

          <HelpTabTrigger />
        </Flex>
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
        <Flex
          css={{
            position: "relative",
            height: "100%",
            flexGrow: 1,
            background: theme.colors.backgroundPanel,
          }}
          direction="column"
        >
          <Panel
            publish={publish}
            onClose={() => setActiveSidebarPanel("none")}
          />
        </Flex>
      </SidebarTabsContent>
    </SidebarTabs>
  );
};
