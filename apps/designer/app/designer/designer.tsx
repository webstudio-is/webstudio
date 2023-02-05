import { useCallback, useEffect, useMemo } from "react";
import { type Publish, usePublish, useSubscribe } from "~/shared/pubsub";
import {
  type Pages,
  utils as projectUtils,
  type Project,
} from "@webstudio-is/project";
import { theme, Box, type CSS, Flex, Grid } from "@webstudio-is/design-system";
import { registerContainers, useDesignerStore } from "~/shared/sync";
import { useSyncServer } from "./shared/sync/sync-server";
// eslint-disable-next-line import/no-internal-modules
import interFont from "@fontsource/inter/variable.css";
// eslint-disable-next-line import/no-internal-modules
import robotoMonoFont from "@fontsource/roboto-mono/index.css";
import { SidebarLeft } from "./features/sidebar-left";
import { Inspector } from "./features/inspector";
import { usePages, useProject, useCurrentPageId } from "./shared/nano-states";
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
  useSetIsPreviewMode,
} from "~/shared/nano-states";
import { useClientSettings } from "./shared/client-settings";
import { Navigator } from "./features/sidebar-left";
import { getBuildUrl } from "~/shared/router-utils";
import { useCopyPasteInstance } from "~/shared/copy-paste";
import { AssetsProvider } from "./shared/assets";

registerContainers();
export const links = () => {
  return [
    { rel: "stylesheet", href: interFont },
    { rel: "stylesheet", href: robotoMonoFont },
    { rel: "stylesheet", href: designerStyles },
  ];
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

const useSubscribeCanvasReady = (publish: Publish) => {
  useSubscribe("canvasReady", () => {
    publish({ type: "canvasReadyAck" });
  });
};

const useSetWindowTitle = () => {
  const [project] = useProject();
  useEffect(() => {
    document.title = `${project?.title} | Webstudio`;
  }, [project?.title]);
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
  if (isPreviewMode === true) {
    return null;
  }
  return (
    <Box
      as="aside"
      css={{
        gridArea,
        display: "flex",
        flexDirection: "column",
        px: 0,
        fg: 0,
        // Left sidebar tabs won't be able to pop out to the right if we set overflowX to auto.
        //overflowY: "auto",
        bc: theme.colors.loContrast,
        height: "100%",
        ...css,
        "&:first-of-type": {
          borderRight: `1px solid  ${theme.colors.borderMain}`,
        },
        "&:last-of-type": {
          borderLeft: `1px solid  ${theme.colors.borderMain}`,
        },
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
      gridTemplateColumns: `auto ${theme.spacing[30]} 1fr ${theme.spacing[30]}`,
      gridTemplateAreas: `
            "header header header header"
            "sidebar navigator main inspector"
            "footer footer footer footer"
          `,
    };
  }

  return {
    gridTemplateColumns: `auto 1fr ${theme.spacing[30]}`,
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
        minWidth: 530, // Enough space to show left sidebars before it becomes broken or unusable
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
          borderRight: `1px solid ${theme.colors.slate7}`,
          width: theme.spacing[30],
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
  treeId: string;
  buildId: string;
  buildOrigin: string;
  authReadToken: string;
  authToken?: string;
  authPermit: "view" | "build" | "own";
};

export const Designer = ({
  project,
  pages,
  pageId,
  treeId,
  buildId,
  buildOrigin,
  authReadToken,
  authToken,
  authPermit,
}: DesignerProps) => {
  useSubscribeBreakpoints();
  useSetProject(project);
  useSetPages(pages);
  useSetCurrentPageId(pageId);
  const [publish, publishRef] = usePublish();
  useDesignerStore(publish);
  useSyncServer({ buildId, treeId, projectId: project.id, authToken });
  useSetIsPreviewMode(authPermit === "view");
  const [isPreviewMode] = useIsPreviewMode();
  usePublishShortcuts(publish);
  const onRefReadCanvasWidth = useUpdateCanvasWidth();
  const { onRef: onRefReadCanvas, onTransitionEnd } = useReadCanvasRect();
  const [dragAndDropState] = useDragAndDropState();
  useSubscribeCanvasReady(publish);
  // We need to initialize this in both canvas and designer,
  // because the events will fire in either one, depending on where the focus is
  useCopyPasteInstance();
  useSetWindowTitle();
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

  const canvasUrl = getBuildUrl({
    buildOrigin,
    project,
    page,
    mode: "edit",
    authReadToken,
  });

  return (
    <AssetsProvider>
      <ChromeWrapper isPreviewMode={isPreviewMode}>
        <Topbar
          gridArea="header"
          project={project}
          publish={publish}
          page={page}
        />
        <Main>
          <Workspace onTransitionEnd={onTransitionEnd} publish={publish}>
            <CanvasIframe
              ref={iframeRefCallback}
              src={canvasUrl}
              pointerEvents={
                dragAndDropState.isDragging &&
                dragAndDropState.origin === "panel"
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
            <Inspector treeId={treeId} publish={publish} />
          )}
        </SidePanel>
        <Footer />
      </ChromeWrapper>
    </AssetsProvider>
  );
};
