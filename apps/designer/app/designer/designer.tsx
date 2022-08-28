import { useCallback } from "react";
import {
  useSubscribe,
  usePublish,
  type Publish,
} from "@webstudio-is/react-sdk";
import { type Project } from "@webstudio-is/prisma-client";
import type { Config } from "~/config";
import type {
  HoveredInstanceData,
  SelectedInstanceData,
} from "~/shared/canvas-components";
import { Box, Flex, Grid, type CSS } from "@webstudio-is/design-system";
import interStyles from "~/shared/font-faces/inter.css";
import { SidebarLeft } from "./features/sidebar-left";
import { Inspector } from "./features/inspector";
import {
  useHoveredInstanceData,
  useSelectedInstanceData,
  useSyncStatus,
} from "./shared/nano-states";
import { Topbar } from "./features/topbar";
import designerStyles from "./designer.css";
import { Footer } from "./features/footer";
import { TreePrevew } from "./features/tree-preview";
import {
  useUpdateCanvasWidth,
  useSubscribeBreakpoints,
} from "./features/breakpoints";
import {
  useReadCanvasRect,
  Workspace,
  CanvasIframe,
} from "./features/workspace";
import { usePublishShortcuts } from "./shared/shortcuts";
import { type SyncStatus } from "~/shared/sync";
import {
  useIsPreviewMode,
  useRootInstance,
  useDragAndDropState,
} from "~/shared/nano-states";
import { useClientSettings } from "./shared/client-settings";
import { Navigator } from "./features/sidebar-left";
import { PANEL_WIDTH } from "./shared/constants";

export const links = () => {
  return [
    { rel: "stylesheet", href: interStyles },
    { rel: "stylesheet", href: designerStyles },
  ];
};

const useSubscribeRootInstance = () => {
  const [, setValue] = useRootInstance();
  useSubscribe<"loadRootInstance">("loadRootInstance", setValue);
};

const useSubscribeSelectedInstanceData = () => {
  const [, setValue] = useSelectedInstanceData();
  useSubscribe<"selectInstance", SelectedInstanceData>(
    "selectInstance",
    setValue
  );
};

const useSubscribeHoveredInstanceData = () => {
  const [, setValue] = useHoveredInstanceData();
  useSubscribe<"hoverInstance", HoveredInstanceData>("hoverInstance", setValue);
};

const useSubscribeSyncStatus = () => {
  const [, setValue] = useSyncStatus();
  useSubscribe<"syncStatus", SyncStatus>("syncStatus", setValue);
};

const useNavigatorLayout = () => {
  // We need to render the detached state only once the setting was actually loaded from local storage.
  // Otherwise we may show the detached state because its the default and then hide it immediately.
  const [clientSettings, _, isLoaded] = useClientSettings();
  return isLoaded ? clientSettings.navigatorLayout : "docked";
};

type SidePanelProps = {
  children: JSX.Element | Array<JSX.Element>;
  isPreviewMode: boolean;
  css?: CSS;
  gridArea: "inspector" | "sidebar" | "navigator";
};

const SidePanel = ({
  children,
  isPreviewMode,
  gridArea,
  css,
}: SidePanelProps) => {
  if (isPreviewMode === true) return null;
  return (
    <Box
      as="aside"
      css={{
        gridArea,
        display: "flex",
        px: 0,
        fg: 0,
        // Left sidebar tabs won't be able to pop out to the right if we set overflowX to auto.
        //overflowY: "auto",
        bc: "$loContrast",
        height: "100%",
        ...css,
        "&:first-of-type": {
          boxShadow: "inset -1px 0 0 0 $colors$panelOutline",
        },
        "&:last-of-type": { boxShadow: "inset 1px 0 0 0 $colors$panelOutline" },
      }}
    >
      {children}
    </Box>
  );
};

const Main = ({ children }: { children: JSX.Element | Array<JSX.Element> }) => (
  <Flex
    as="main"
    direction="column"
    css={{
      gridArea: "main",
      overflow: "hidden",
    }}
  >
    {children}
  </Flex>
);

type ChromeWrapperProps = {
  children: Array<JSX.Element | null>;
  isPreviewMode: boolean;
};

const getChromeLayout = ({
  isPreviewMode,
  navigatorLayout,
}: {
  isPreviewMode: boolean;
  navigatorLayout: "docked" | "undocked";
}) => {
  if (isPreviewMode) {
    return {
      gridTemplateColumns: "auto 1fr",
      gridTemplateAreas: `
            "header header"
            "sidebar main"
            "footer footer"
          `,
    };
  }

  if (navigatorLayout === "undocked") {
    return {
      gridTemplateColumns: `auto ${PANEL_WIDTH}px 1fr ${PANEL_WIDTH}px`,
      gridTemplateAreas: `
            "header header header header"
            "sidebar navigator main inspector"
            "footer footer footer footer"
          `,
    };
  }

  return {
    gridTemplateColumns: `auto 1fr ${PANEL_WIDTH}px`,
    gridTemplateAreas: `
          "header header header"
          "sidebar main inspector"
          "footer footer footer"
        `,
  };
};

const ChromeWrapper = ({ children, isPreviewMode }: ChromeWrapperProps) => {
  const navigatorLayout = useNavigatorLayout();
  const gridLayout = getChromeLayout({
    isPreviewMode,
    navigatorLayout,
  });

  return (
    <Grid
      css={{
        height: "100vh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        ...gridLayout,
      }}
    >
      {children}
    </Grid>
  );
};

type NavigatorPanelProps = { publish: Publish; isPreviewMode: boolean };

const NavigatorPanel = ({ publish, isPreviewMode }: NavigatorPanelProps) => {
  const navigatorLayout = useNavigatorLayout();

  if (navigatorLayout === "docked") {
    return null;
  }

  return (
    <SidePanel gridArea="navigator" isPreviewMode={isPreviewMode}>
      <Box
        css={{
          borderRight: "1px solid $slate7",
          width: PANEL_WIDTH,
          height: "100%",
        }}
      >
        <Navigator publish={publish} isClosable={false} />
      </Box>
    </SidePanel>
  );
};

type DesignerProps = {
  config: Config;
  project: Project;
};

export const Designer = ({ config, project }: DesignerProps) => {
  useSubscribeSyncStatus();
  useSubscribeRootInstance();
  useSubscribeSelectedInstanceData();
  useSubscribeHoveredInstanceData();
  useSubscribeBreakpoints();
  const [publish, publishRef] = usePublish();
  const [isPreviewMode] = useIsPreviewMode();
  usePublishShortcuts(publish);
  const onRefReadCanvasWidth = useUpdateCanvasWidth();
  const { onRef: onRefReadCanvas, onTransitionEnd } = useReadCanvasRect();
  const [dragAndDropState] = useDragAndDropState();

  const iframeRefCallback = useCallback(
    (ref) => {
      publishRef.current = ref;
      onRefReadCanvasWidth(ref);
      onRefReadCanvas(ref);
    },
    [publishRef, onRefReadCanvasWidth, onRefReadCanvas]
  );

  return (
    <ChromeWrapper isPreviewMode={isPreviewMode}>
      <Topbar
        css={{ gridArea: "header" }}
        config={config}
        project={project}
        publish={publish}
      />
      <Main>
        <Workspace onTransitionEnd={onTransitionEnd} publish={publish}>
          <CanvasIframe
            ref={iframeRefCallback}
            src={`${config.canvasPath}/${project.id}`}
            pointerEvents={
              dragAndDropState.isDragging && dragAndDropState.origin === "panel"
                ? "none"
                : "all"
            }
            title={project.title}
            css={{
              height: "100%",
              width: "100%",
            }}
          />
        </Workspace>
      </Main>
      <SidePanel gridArea="sidebar" isPreviewMode={isPreviewMode}>
        <SidebarLeft assets={project.assets} publish={publish} />
      </SidePanel>
      <NavigatorPanel publish={publish} isPreviewMode={isPreviewMode} />
      <SidePanel
        gridArea="inspector"
        isPreviewMode={isPreviewMode}
        css={{ overflow: "hidden" }}
      >
        {dragAndDropState.isDragging ? (
          <TreePrevew />
        ) : (
          <Inspector publish={publish} />
        )}
      </SidePanel>
      <Footer publish={publish} />
    </ChromeWrapper>
  );
};
