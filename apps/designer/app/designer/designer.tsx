import { useCallback, useEffect, useMemo } from "react";
import { type Publish, usePublish, useSubscribe } from "~/shared/pubsub";
import {
  type Pages,
  type Project,
  utils as projectUtils,
} from "@webstudio-is/project";
import { Box, type CSS, Flex, Grid } from "@webstudio-is/design-system";
import interStyles from "~/shared/font-faces/inter.css";
import { SidebarLeft } from "./features/sidebar-left";
import { Inspector } from "./features/inspector";
import {
  useHoveredInstanceData,
  usePages,
  useProject,
  useCurrentPageId,
  useSelectedInstanceData,
  useSyncStatus,
} from "./shared/nano-states";
import { Topbar } from "./features/topbar";
import designerStyles from "./designer.css";
import { Footer } from "./features/footer";
import { TreePrevew } from "./features/tree-preview";
import {
  useSubscribeBreakpoints,
  useUpdateCanvasWidth,
} from "./features/breakpoints";
import {
  CanvasIframe,
  useReadCanvasRect,
  Workspace,
} from "./features/workspace";
import { usePublishShortcuts } from "./shared/shortcuts";
import {
  useDragAndDropState,
  useIsPreviewMode,
  useRootInstance,
} from "~/shared/nano-states";
import { useClientSettings } from "./shared/client-settings";
import { Navigator } from "./features/sidebar-left";
import { useSetAssets } from "./shared/assets";
import { getBuildUrl } from "~/shared/router-utils";
import { useSubscribeCopyPaste } from "~/shared/copy-paste";

export const links = () => {
  return [
    { rel: "stylesheet", href: interStyles },
    { rel: "stylesheet", href: designerStyles },
  ];
};

const useSubscribeRootInstance = () => {
  const [, setValue] = useRootInstance();
  useSubscribe("loadRootInstance", setValue);
};

const useSubscribeSelectedInstanceData = () => {
  const [, setValue] = useSelectedInstanceData();
  useSubscribe("selectInstance", setValue);
};

const useSubscribeHoveredInstanceData = () => {
  const [, setValue] = useHoveredInstanceData();
  useSubscribe("hoverInstance", setValue);
};

const useSubscribeSyncStatus = () => {
  const [, setValue] = useSyncStatus();
  useSubscribe("syncStatus", setValue);
};

const useSetProject = (project: Project) => {
  const [, setProject] = useProject();
  useEffect(() => {
    setProject(project);
  }, [project, setProject]);
};

const useSetPages = (pages: Pages) => {
  const [, setPages] = usePages();
  useEffect(() => {
    setPages(pages);
  }, [pages, setPages]);
};

const useSetCurrentPageId = (pageId: string) => {
  const [, setCurrentPageId] = useCurrentPageId();
  useEffect(() => {
    setCurrentPageId(pageId);
  }, [pageId, setCurrentPageId]);
};

const useNavigatorLayout = () => {
  // We need to render the detached state only once the setting was actually loaded from local storage.
  // Otherwise we may show the detached state because its the default and then hide it immediately.
  const [clientSettings, _, isLoaded] = useClientSettings();
  return isLoaded ? clientSettings.navigatorLayout : "docked";
};

export const useSubscribeCanvasReady = (publish: Publish) => {
  useSubscribe("canvasReady", () => {
    publish({ type: "canvasReadyAck" });
  });
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
      gridTemplateColumns: `auto $spacing$30 1fr $spacing$30`,
      gridTemplateAreas: `
            "header header header header"
            "sidebar navigator main inspector"
            "footer footer footer footer"
          `,
    };
  }

  return {
    gridTemplateColumns: `auto 1fr $spacing$30`,
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
          width: "$spacing$30",
          height: "100%",
        }}
      >
        <Navigator publish={publish} isClosable={false} />
      </Box>
    </SidePanel>
  );
};

export type DesignerProps = {
  project: Project;
  pages: Pages;
  pageId: string;
  buildOrigin: string;
};

export const Designer = ({
  project,
  pages,
  pageId,
  buildOrigin,
}: DesignerProps) => {
  useSubscribeSyncStatus();
  useSubscribeRootInstance();
  useSubscribeSelectedInstanceData();
  useSubscribeHoveredInstanceData();
  useSubscribeBreakpoints();
  useSetProject(project);
  useSetPages(pages);
  useSetCurrentPageId(pageId);
  const [publish, publishRef] = usePublish();
  useSetAssets({ assets: project.assets, publish });
  const [isPreviewMode] = useIsPreviewMode();
  usePublishShortcuts(publish);
  const onRefReadCanvasWidth = useUpdateCanvasWidth();
  const { onRef: onRefReadCanvas, onTransitionEnd } = useReadCanvasRect();
  const [dragAndDropState] = useDragAndDropState();
  useSubscribeCanvasReady(publish);
  useSubscribeCopyPaste(publish);

  const iframeRefCallback = useCallback(
    (ref) => {
      publishRef.current = ref;
      onRefReadCanvasWidth(ref);
      onRefReadCanvas(ref);
    },
    [publishRef, onRefReadCanvasWidth, onRefReadCanvas]
  );

  const page = useMemo(() => {
    const page = projectUtils.pages.findByIdOrPath(pages, pageId);
    if (page === undefined) {
      throw new Error(`Page with id ${pageId} not found`);
    }
    return page;
  }, [pages, pageId]);

  const canvasUrl = getBuildUrl({ buildOrigin, project, page, mode: "edit" });

  const previewUrl = getBuildUrl({
    buildOrigin,
    project,
    page,
    mode: "preview",
  });

  return (
    <ChromeWrapper isPreviewMode={isPreviewMode}>
      <Topbar
        css={{ gridArea: "header" }}
        project={project}
        publish={publish}
        previewUrl={previewUrl}
      />
      <Main>
        <Workspace onTransitionEnd={onTransitionEnd} publish={publish}>
          <CanvasIframe
            ref={iframeRefCallback}
            src={canvasUrl}
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
        <SidebarLeft publish={publish} />
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
