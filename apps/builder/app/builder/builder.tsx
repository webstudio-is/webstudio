import { useCallback, useEffect, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { useUnmount } from "react-use";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { usePublish, $publisher } from "~/shared/pubsub";
import type { Asset } from "@webstudio-is/sdk";
import type { Build } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import { theme, Box, type CSS, Flex, Grid } from "@webstudio-is/design-system";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { registerContainers, useBuilderStore } from "~/shared/sync";
import { useSyncServer } from "./shared/sync/sync-server";
import { SidebarLeft, Navigator } from "./features/sidebar-left";
import { Inspector } from "./features/inspector";
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
import {
  $assets,
  $authPermit,
  $authToken,
  $breakpoints,
  $dataSources,
  $instances,
  $isPreviewMode,
  $pages,
  $project,
  $props,
  $styleSourceSelections,
  $styleSources,
  $styles,
  $domains,
  $resources,
  subscribeResources,
} from "~/shared/nano-states";
import { type Settings } from "./shared/client-settings";
import { getBuildUrl } from "~/shared/router-utils";
import { useCopyPaste } from "~/shared/copy-paste";
import { BlockingAlerts } from "./features/blocking-alerts";
import { useSyncPageUrl } from "~/shared/pages";
import { useMount } from "~/shared/hook-utils/use-mount";
import { subscribeCommands } from "~/builder/shared/commands";
import { AiCommandBar } from "./features/ai/ai-command-bar";
import { ProjectSettings } from "./features/project-settings";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import { $userPlanFeatures } from "./shared/nano-states";
import { useNavigatorLayout } from "./features/sidebar-left/navigator";

registerContainers();

// Can cause FOUC because of remix-island, be very accurate adding anything here
export const links = () => {
  return [
    { rel: "stylesheet", href: builderStyles },
    { rel: "stylesheet", href: prismStyles },
  ];
};

const useSetWindowTitle = () => {
  const project = useStore($project);
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

const Main = ({ children }: { children: ReactNode }) => (
  <Flex
    as="main"
    direction="column"
    css={{
      gridArea: "main",
      overflow: "hidden",
      position: "relative",
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
};

const NavigatorPanel = ({
  isPreviewMode,
  navigatorLayout,
}: NavigatorPanelProps) => {
  if (navigatorLayout === "docked") {
    return;
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
        <Navigator isClosable={false} />
      </Box>
    </SidePanel>
  );
};

export type BuilderProps = {
  project: Project;
  domains: string[];
  build: Build;
  assets: [Asset["id"], Asset][];
  authToken?: string;
  authPermit: AuthPermit;
  userPlanFeatures: UserPlanFeatures;
};

export const Builder = ({
  project,
  domains,
  build,
  assets,
  authToken,
  authPermit,
  userPlanFeatures,
}: BuilderProps) => {
  useMount(() => {
    // additional data stores
    $project.set(project);
    $domains.set(domains);
    $authPermit.set(authPermit);
    $authToken.set(authToken);
    $userPlanFeatures.set(userPlanFeatures);

    // set initial containers value
    $assets.set(new Map(assets));
    $instances.set(new Map(build.instances));
    $dataSources.set(new Map(build.dataSources));
    $resources.set(new Map(build.resources));
    // props should be after data sources to compute logic
    $props.set(new Map(build.props));
    $pages.set(build.pages);
    $styleSources.set(new Map(build.styleSources));
    $styleSourceSelections.set(new Map(build.styleSourceSelections));
    $breakpoints.set(new Map(build.breakpoints));
    $styles.set(new Map(build.styles));
  });

  useEffect(subscribeCommands, []);
  useEffect(subscribeResources, []);

  useUnmount(() => {
    $pages.set(undefined);
  });

  useSyncPageUrl();

  const [publish, publishRef] = usePublish();
  useEffect(() => {
    $publisher.set({ publish });
  }, [publish]);

  useBuilderStore(publish);
  useSyncServer({
    buildId: build.id,
    projectId: project.id,
    authToken,
    authPermit,
    version: build.version,
  });

  const isPreviewMode = useStore($isPreviewMode);
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

  const navigatorLayout = useNavigatorLayout();

  const canvasUrl = getBuildUrl({
    project,
  });

  return (
    <TooltipProvider>
      <ChromeWrapper isPreviewMode={isPreviewMode}>
        <ProjectSettings />
        <Topbar
          gridArea="header"
          project={project}
          hasProPlan={userPlanFeatures.hasProPlan}
        />
        <Main>
          <Workspace
            onTransitionEnd={onTransitionEnd}
            initialBreakpoints={build.breakpoints}
          >
            <CanvasIframe
              ref={iframeRefCallback}
              src={canvasUrl}
              title={project.title}
              css={{
                height: "100%",
                width: "100%",
                backgroundColor: "#fff",
              }}
            />
          </Workspace>
          <AiCommandBar isPreviewMode={isPreviewMode} />
        </Main>
        <SidePanel gridArea="sidebar" isPreviewMode={isPreviewMode}>
          <SidebarLeft publish={publish} />
        </SidePanel>
        <NavigatorPanel
          isPreviewMode={isPreviewMode}
          navigatorLayout={navigatorLayout}
        />
        <SidePanel
          gridArea="inspector"
          isPreviewMode={isPreviewMode}
          css={{ overflow: "hidden" }}
        >
          <Inspector navigatorLayout={navigatorLayout} />
        </SidePanel>
        {isPreviewMode === false && <Footer />}
        <BlockingAlerts />
      </ChromeWrapper>
    </TooltipProvider>
  );
};
