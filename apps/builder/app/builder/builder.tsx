import { useCallback, useEffect } from "react";
import { type Publish, usePublish } from "~/shared/pubsub";
import type { Build } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import { theme, Box, type CSS, Flex, Grid } from "@webstudio-is/design-system";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { registerContainers, useBuilderStore } from "~/shared/sync";
import { useSyncServer } from "./shared/sync/sync-server";
import { useSharedShortcuts } from "~/shared/shortcuts";
import { SidebarLeft, Navigator } from "./features/sidebar-left";
import { Inspector } from "./features/inspector";
import { isCanvasPointerEventsEnabledStore } from "./shared/nano-states";
import { Topbar } from "./features/topbar";
import builderStyles from "./builder.css";
// eslint-disable-next-line import/no-internal-modules
import prismStyles from "prismjs/themes/prism-solarizedlight.min.css";
import { Footer } from "./features/footer";
import {
  CanvasIframe,
  useReadCanvasRect,
  Workspace,
} from "./features/workspace";
import { usePublishShortcuts } from "./shared/shortcuts";
import {
  projectStore,
  useIsPreviewMode,
  useSetAssets,
  useSetAuthPermit,
  useSetAuthToken,
  useSetBreakpoints,
  useSetDataSources,
  useSetInstances,
  useSetPages,
  useSetProps,
  useSetStyles,
  useSetStyleSources,
  useSetStyleSourceSelections,
} from "~/shared/nano-states";
import { type Settings, useClientSettings } from "./shared/client-settings";
import { getBuildUrl } from "~/shared/router-utils";
import { useCopyPaste } from "~/shared/copy-paste";
import type { Asset } from "@webstudio-is/asset-uploader";
import { BlockingAlerts } from "./features/blocking-alerts";
import { useStore } from "@nanostores/react";
import { useSyncPageUrl } from "~/shared/pages";

registerContainers();

// Can cause FOUC because of remix-island, be very accurate adding anything here
export const links = () => {
  return [
    { rel: "stylesheet", href: builderStyles },
    { rel: "stylesheet", href: prismStyles },
  ];
};

const useSetProject = (project: Project) => {
  useEffect(() => {
    projectStore.set(project);
  }, [project]);
};

const useNavigatorLayout = () => {
  // We need to render the detached state only once the setting was actually loaded from local storage.
  // Otherwise we may show the detached state because its the default and then hide it immediately.
  const [clientSettings, _, isLoaded] = useClientSettings();
  return isLoaded ? clientSettings.navigatorLayout : "undocked";
};

const useSetWindowTitle = () => {
  const project = useStore(projectStore);
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
  return (
    <Box
      as="aside"
      css={{
        gridArea,
        display: isPreviewMode ? "none" : "flex",
        flexDirection: "column",
        px: 0,
        fg: 0,
        // Left sidebar tabs won't be able to pop out to the right if we set overflowX to auto.
        //overflowY: "auto",
        bc: theme.colors.backgroundPanel,
        height: "100%",
        ...css,
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
  children: Array<JSX.Element | null | false>;
  isPreviewMode: boolean;
};

const getChromeLayout = ({
  isPreviewMode,
  navigatorLayout,
}: {
  isPreviewMode: boolean;
  navigatorLayout: Settings["navigatorLayout"];
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

type NavigatorPanelProps = {
  isPreviewMode: boolean;
  navigatorLayout: "docked" | "undocked";
  publish: Publish;
};

const NavigatorPanel = ({
  isPreviewMode,
  navigatorLayout,
  publish,
}: NavigatorPanelProps) => {
  if (navigatorLayout === "docked") {
    return null;
  }

  return (
    <SidePanel gridArea="navigator" isPreviewMode={isPreviewMode}>
      <Box
        css={{
          borderRight: `1px solid ${theme.colors.borderMain}`,
          width: theme.spacing[30],
          height: "100%",
        }}
      >
        <Navigator isClosable={false} publish={publish} />
      </Box>
    </SidePanel>
  );
};

export type BuilderProps = {
  project: Project;
  build: Build;
  assets: [Asset["id"], Asset][];
  buildOrigin: string;
  authToken?: string;
  authPermit: AuthPermit;
};

export const Builder = ({
  project,
  build,
  assets,
  buildOrigin,
  authToken,
  authPermit,
}: BuilderProps) => {
  useSetProject(project);
  useSetPages(build.pages);
  useSetBreakpoints(build.breakpoints);
  useSetProps(build.props);
  useSetDataSources(build.dataSources);
  useSetStyles(build.styles);
  useSetStyleSources(build.styleSources);
  useSetStyleSourceSelections(build.styleSourceSelections);
  useSetInstances(build.instances);

  useSyncPageUrl();

  useSetAssets(assets);
  useSetAuthToken(authToken);
  useSetAuthPermit(authPermit);

  const [publish, publishRef] = usePublish();
  useBuilderStore(publish);
  useSyncServer({
    buildId: build.id,
    projectId: project.id,
    authToken,
    authPermit,
    version: build.version,
  });
  useSharedShortcuts({ source: "builder" });

  const [isPreviewMode] = useIsPreviewMode();
  usePublishShortcuts(publish);
  const { onRef: onRefReadCanvas, onTransitionEnd } = useReadCanvasRect();
  // We need to initialize this in both canvas and builder,
  // because the events will fire in either one, depending on where the focus is
  useCopyPaste();
  useSetWindowTitle();
  const iframeRefCallback = useCallback(
    (element: HTMLIFrameElement) => {
      publishRef.current = element;
      onRefReadCanvas(element);
    },
    [publishRef, onRefReadCanvas]
  );
  const isCanvasPointerEventsEnabled = useStore(
    isCanvasPointerEventsEnabledStore
  );

  const navigatorLayout = useNavigatorLayout();

  const canvasUrl = getBuildUrl({
    buildOrigin,
    project,
  });

  return (
    <ChromeWrapper isPreviewMode={isPreviewMode}>
      <Topbar gridArea="header" project={project} publish={publish} />
      <Main>
        <Workspace onTransitionEnd={onTransitionEnd} publish={publish}>
          <CanvasIframe
            ref={iframeRefCallback}
            src={canvasUrl}
            pointerEvents={isCanvasPointerEventsEnabled ? "auto" : "none"}
            title={project.title}
            css={{
              height: "100%",
              width: "100%",
              backgroundColor: "#fff",
            }}
          />
        </Workspace>
      </Main>
      <SidePanel gridArea="sidebar" isPreviewMode={isPreviewMode}>
        <SidebarLeft publish={publish} />
      </SidePanel>
      <NavigatorPanel
        isPreviewMode={isPreviewMode}
        navigatorLayout={navigatorLayout}
        publish={publish}
      />
      <SidePanel
        gridArea="inspector"
        isPreviewMode={isPreviewMode}
        css={{ overflow: "hidden" }}
      >
        <Inspector publish={publish} navigatorLayout={navigatorLayout} />
      </SidePanel>
      {isPreviewMode === false && <Footer />}
      <BlockingAlerts />
    </ChromeWrapper>
  );
};
