import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  theme,
  Box,
  type CSS,
  Flex,
  Grid,
  rawTheme,
} from "@webstudio-is/design-system";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { initializeClientSync, getSyncClient } from "~/shared/sync/sync-client";
import { usePreventUnload } from "~/shared/sync/project-queue";
import { usePublish, $publisher } from "~/shared/pubsub";
import { Inspector } from "./inspector";
import { Topbar } from "./features/topbar";
import { Footer } from "./features/footer";
import {
  CanvasIframe,
  CanvasToolsContainer,
  Workspace,
} from "./features/workspace";
import {
  $authPermit,
  $authToken,
  $isPreviewMode,
  $pages,
  $project,
  subscribeResources,
  $authTokenPermissions,
  $isDesignMode,
  $isContentMode,
  $userPlanFeatures,
  subscribeModifierKeys,
  $stagingUsername,
  $stagingPassword,
} from "~/shared/nano-states";
import { $settings, type Settings } from "./shared/client-settings";
import { builderUrl, getCanvasUrl } from "~/shared/router-utils";
import { BlockingAlerts } from "./features/blocking-alerts";
import { useSyncPageUrl } from "~/shared/pages";
import { useMount, useUnmount } from "~/shared/hook-utils/use-mount";
import { subscribeCommands } from "~/builder/shared/commands";
import { ProjectSettings } from "~/shared/project-settings";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import {
  $activeSidebarPanel,
  $dataLoadingState,
  $isCloneDialogOpen,
  $loadingState,
} from "./shared/nano-states";
import { CloneProjectDialog } from "~/shared/clone-project";
import type { TokenPermissions } from "@webstudio-is/authorization-token";
import { useToastErrors } from "~/shared/error/toast-error";
import { initBuilderApi } from "~/shared/builder-api";
import { updateWebstudioData } from "~/shared/instance-utils";
import { migrateWebstudioDataMutable } from "~/shared/webstudio-data-migrator";
import { Loading, LoadingBackground } from "./shared/loading";
import { mergeRefs } from "@react-aria/utils";
import { CommandPanel } from "./features/command-panel";
import { DeleteUnusedTokensDialog } from "~/builder/shared/style-source-actions";
import { DeleteUnusedDataVariablesDialog } from "~/builder/shared/data-variable-utils";
import { DeleteUnusedCssVariablesDialog } from "~/builder/shared/css-variable-utils";
import { KeyboardShortcutsDialog } from "./features/keyboard-shortcuts-dialog";
import { TokenConflictDialog } from "~/shared/token-conflict-dialog";

import {
  initCopyPaste,
  initCopyPasteForContentEditMode,
} from "~/shared/copy-paste/init-copy-paste";
import { useInertHandlers } from "./shared/inert-handlers";
import { TextToolbar } from "./features/workspace/canvas-tools/text-toolbar";
import { RemoteDialog } from "./features/help/remote-dialog";
import type { SidebarPanelName } from "./sidebar-left/types";
import { SidebarLeft } from "./sidebar-left/sidebar-left";
import { useDisableContextMenu } from "./shared/use-disable-context-menu";

const useSetWindowTitle = () => {
  const project = useStore($project);
  useEffect(() => {
    document.title = `${project?.title} | Webstudio`;
  }, [project?.title]);
};

type SidePanelProps = {
  children: JSX.Element | Array<JSX.Element>;
  isPreviewMode?: boolean;
  css?: CSS;
  gridArea: "inspector" | "sidebar" | "navigator";
};

const SidePanel = ({
  children,
  isPreviewMode = false,
  gridArea,
  css,
}: SidePanelProps) => {
  return (
    <Box
      as="aside"
      css={{
        position: "relative",
        isolation: "isolate",
        gridArea,
        display: isPreviewMode ? "none" : "flex",
        flexDirection: "column",
        px: 0,
        fg: 0,
        // Left sidebar tabs won't be able to pop out to the right if we set overflowX to auto.
        //overflowY: "auto",
        backgroundColor: theme.colors.backgroundPanel,
        height: "100%",
        ...css,
      }}
    >
      {children}
    </Box>
  );
};

const Main = ({ children, css }: { children: ReactNode; css?: CSS }) => (
  <Flex
    as="main"
    direction="column"
    css={{
      gridArea: "main",
      position: "relative",
      isolation: "isolate",
      ...css,
    }}
  >
    {children}
  </Flex>
);

type ChromeWrapperProps = {
  children: Array<JSX.Element | null | false>;
  isPreviewMode: boolean;
  navigatorLayout: Settings["navigatorLayout"];
};

const getChromeLayout = ({
  isPreviewMode,
  navigatorLayout,
  activeSidebarPanel,
  leftSidebarWidth,
}: {
  isPreviewMode: boolean;
  navigatorLayout: Settings["navigatorLayout"];
  activeSidebarPanel?: SidebarPanelName;
  leftSidebarWidth: number;
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

  if (navigatorLayout === "undocked" && activeSidebarPanel !== "none") {
    return {
      gridTemplateColumns: `auto ${leftSidebarWidth}px 1fr ${theme.sizes.sidebarWidth}`,
      gridTemplateAreas: `
            "header header header header"
            "sidebar navigator main inspector"
            "footer footer footer footer"
          `,
    };
  }

  return {
    gridTemplateColumns: `auto 1fr ${theme.sizes.sidebarWidth}`,
    gridTemplateAreas: `
          "header header header"
          "sidebar main inspector"
          "footer footer footer"
        `,
  };
};

const defaultSidebarWidth = Number.parseFloat(rawTheme.spacing[30]);

const ChromeWrapper = ({
  children,
  isPreviewMode,
  navigatorLayout,
}: ChromeWrapperProps) => {
  const activeSidebarPanel = useStore($activeSidebarPanel);
  const settings = useStore($settings);
  const leftSidebarWidth =
    activeSidebarPanel === "none"
      ? defaultSidebarWidth
      : (settings.sidebarPanelWidths[activeSidebarPanel] ??
        defaultSidebarWidth);

  const gridLayout = getChromeLayout({
    isPreviewMode,
    navigatorLayout,
    activeSidebarPanel,
    leftSidebarWidth,
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

export type BuilderProps = {
  projectId: string;
  authToken?: string;
  authPermit: AuthPermit;
  authTokenPermissions: TokenPermissions;
  userPlanFeatures: UserPlanFeatures;
  stagingUsername: string;
  stagingPassword: string;
};

export const Builder = ({
  projectId,
  authToken,
  authPermit,
  userPlanFeatures,
  authTokenPermissions,
  stagingUsername,
  stagingPassword,
}: BuilderProps) => {
  useMount(initBuilderApi);

  useMount(() => {
    // additional data stores
    $authPermit.set(authPermit);
    $authToken.set(authToken);
    $userPlanFeatures.set(userPlanFeatures);
    $authTokenPermissions.set(authTokenPermissions);
    $stagingUsername.set(stagingUsername);
    $stagingPassword.set(stagingPassword);

    const controller = new AbortController();

    $dataLoadingState.set("loading");
    initializeClientSync({
      projectId,
      authPermit,
      authToken,
      signal: controller.signal,
      onReady() {
        updateWebstudioData((data) => {
          migrateWebstudioDataMutable(data);
        });

        // render canvas only after all data is loaded
        // so builder is started listening for connect event
        // when canvas is rendered
        $dataLoadingState.set("loaded");

        // @todo make needs error handling and error state? e.g. a toast
      },
    });

    return () => {
      $dataLoadingState.set("idle");
      controller.abort("unmount");
    };
  });

  useToastErrors();
  useEffect(subscribeCommands, []);
  useEffect(subscribeResources, []);
  useDisableContextMenu();

  useUnmount(() => {
    $pages.set(undefined);
  });

  useSyncPageUrl();

  const [publish, publishRef] = usePublish();
  useEffect(() => {
    $publisher.set({ publish });
  }, [publish]);

  const project = useStore($project);

  usePreventUnload();
  const isCloneDialogOpen = useStore($isCloneDialogOpen);
  const isPreviewMode = useStore($isPreviewMode);
  const isDesignMode = useStore($isDesignMode);
  const isContentMode = useStore($isContentMode);

  useSetWindowTitle();

  const iframeRefCallback = useMemo(
    () =>
      mergeRefs((element: HTMLIFrameElement | null) => {
        if (element?.contentWindow) {
          const client = getSyncClient();
          if (client) {
            // added to iframe window and stored in local variable right away to prevent
            // overriding in emebedded scripts on canvas
            element.contentWindow.__webstudioSharedSyncEmitter__ =
              client.emitter;
          }
        }
      }, publishRef),
    [publishRef]
  );

  const { navigatorLayout } = useStore($settings);
  const dataLoadingState = useStore($dataLoadingState);
  const [loadingState, setLoadingState] = useState(() => $loadingState.get());

  useEffect(() => {
    const abortController = new AbortController();

    if (isDesignMode) {
      // We need to initialize this in both canvas and builder,
      // because the events will fire in either one, depending on where the focus is
      // @todo we need to forward the events from canvas to builder and avoid importing this
      // in both places
      initCopyPaste(abortController);
      subscribeModifierKeys({ signal: abortController.signal });
    }

    if (isContentMode) {
      initCopyPasteForContentEditMode(abortController);
      subscribeModifierKeys({ signal: abortController.signal });
    }

    return () => {
      abortController.abort();
    };
  }, [isContentMode, isDesignMode]);

  useEffect(() => {
    const unsubscribe = $loadingState.subscribe((loadingState) => {
      setLoadingState(loadingState);
      // We need to stop updating it once it's ready in case in the future it changes again.
      if (loadingState.state === "ready") {
        unsubscribe();
      }
    });
    return unsubscribe;
  }, []);

  const canvasUrl = getCanvasUrl();

  const inertHandlers = useInertHandlers();

  // Show loading screen if project isn't ready yet
  if (!project || dataLoadingState !== "loaded") {
    return (
      <TooltipProvider>
        <Loading state={loadingState} />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div
        style={{ display: "contents" }}
        onPointerDown={inertHandlers.onPointerDown}
        onInput={inertHandlers.onInput}
        onKeyDown={inertHandlers.onKeyDown}
      >
        <ChromeWrapper
          isPreviewMode={isPreviewMode}
          navigatorLayout={navigatorLayout}
        >
          <Box
            data-dialog-boundary
            css={{
              gridArea: "sidebar / sidebar / main / inspector",
              pointerEvents: "none",
            }}
          />
          <ProjectSettings />

          {/* Main must be after left sidebar panels because in content mode the Plus button must be above the left sidebar, otherwise it won't be visible when content is full width */}
          <Main>
            <Workspace>
              {dataLoadingState === "loaded" && project && (
                <CanvasIframe
                  ref={iframeRefCallback}
                  src={canvasUrl}
                  title={project.title}
                />
              )}
            </Workspace>
          </Main>
          <Main css={{ pointerEvents: "none" }}>
            <CanvasToolsContainer />
          </Main>
          <SidePanel
            gridArea="sidebar"
            css={{
              order: navigatorLayout === "docked" ? 1 : undefined,
            }}
          >
            <SidebarLeft publish={publish} />
          </SidePanel>

          <SidePanel
            gridArea="inspector"
            isPreviewMode={isPreviewMode}
            css={{
              overflow: "hidden",
              // Drawing border this way to ensure content still has full width, avoid subpixels and give layout round numbers
              "&::after": {
                content: "''",
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: 1,
                background: theme.colors.borderMain,
              },
            }}
          >
            <Inspector navigatorLayout={navigatorLayout} />
          </SidePanel>
          <Main css={{ pointerEvents: "none" }}>
            <CanvasToolsContainer />
          </Main>
          {project ? (
            <Topbar
              project={project}
              css={{ gridArea: "header" }}
              loading={
                <LoadingBackground
                  // Looks nicer when topbar is already visible earlier, so user has more sense of progress.
                  show={
                    loadingState.readyStates.get("dataLoadingState")
                      ? false
                      : true
                  }
                />
              }
            />
          ) : null}
          <Main css={{ pointerEvents: "none" }}>
            <TextToolbar />
          </Main>
          {isPreviewMode === false && <Footer />}
          {project ? (
            <CloneProjectDialog
              isOpen={isCloneDialogOpen}
              onOpenChange={$isCloneDialogOpen.set}
              project={project}
              onCreate={(projectId) => {
                window.location.href = builderUrl({
                  origin: window.origin,
                  projectId: projectId,
                });
              }}
            />
          ) : null}
        </ChromeWrapper>
        <Loading state={loadingState} />
        <BlockingAlerts />
        <CommandPanel />
        <DeleteUnusedTokensDialog />
        <DeleteUnusedDataVariablesDialog />
        <DeleteUnusedCssVariablesDialog />
        <KeyboardShortcutsDialog />
        <TokenConflictDialog />
        <RemoteDialog />
      </div>
    </TooltipProvider>
  );
};
