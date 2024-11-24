import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { usePublish, $publisher } from "~/shared/pubsub";
import type { Build } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import { theme, Box, type CSS, Flex, Grid } from "@webstudio-is/design-system";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { createImageLoader } from "@webstudio-is/image";
import {
  builderClient,
  registerContainers,
  useBuilderStore,
} from "~/shared/sync";
import { startProjectSync, useSyncServer } from "./shared/sync/sync-server";
import { SidebarLeft } from "./sidebar-left";
import { Inspector } from "./features/inspector";
import { Topbar } from "./features/topbar";
import { Footer } from "./features/footer";
import {
  CanvasIframe,
  useReadCanvasRect,
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
  $publisherHost,
  $imageLoader,
  $textEditingInstanceSelector,
  $isDesignMode,
  $isContentMode,
  $userPlanFeatures,
} from "~/shared/nano-states";
import { $settings, type Settings } from "./shared/client-settings";
import { builderUrl, getCanvasUrl } from "~/shared/router-utils";
import { BlockingAlerts } from "./features/blocking-alerts";
import { useSyncPageUrl } from "~/shared/pages";
import { useMount, useUnmount } from "~/shared/hook-utils/use-mount";
import { subscribeCommands } from "~/builder/shared/commands";
import { AiCommandBar } from "./features/ai/ai-command-bar";
import { ProjectSettings } from "./features/project-settings";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import {
  $activeSidebarPanel,
  $dataLoadingState,
  $isCloneDialogOpen,
  $loadingState,
  type SidebarPanelName,
} from "./shared/nano-states";
import { CloneProjectDialog } from "~/shared/clone-project";
import type { TokenPermissions } from "@webstudio-is/authorization-token";
import { useToastErrors } from "~/shared/error/toast-error";
import { canvasApi } from "~/shared/canvas-api";
import { loadBuilderData, setBuilderData } from "~/shared/builder-data";
import { initBuilderApi } from "~/shared/builder-api";
import { updateWebstudioData } from "~/shared/instance-utils";
import { migrateWebstudioDataMutable } from "~/shared/webstudio-data-migrator";
import { Loading, LoadingBackground } from "./shared/loading";
import { mergeRefs } from "@react-aria/utils";
import { CommandPanel } from "./features/command-panel";
import {
  initCopyPaste,
  initCopyPasteForContentEditMode,
} from "~/shared/copy-paste/init-copy-paste";

registerContainers();

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
      id="jopa"
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

const Main = ({ children }: { children: ReactNode }) => (
  <Flex
    as="main"
    direction="column"
    css={{
      gridArea: "main",
      position: "relative",
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
}: {
  isPreviewMode: boolean;
  navigatorLayout: Settings["navigatorLayout"];
  activeSidebarPanel?: SidebarPanelName;
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

const ChromeWrapper = ({
  children,
  isPreviewMode,
  navigatorLayout,
}: ChromeWrapperProps) => {
  const activeSidebarPanel = useStore($activeSidebarPanel);
  const gridLayout = getChromeLayout({
    isPreviewMode,
    navigatorLayout,
    activeSidebarPanel,
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
  project: Project;
  publisherHost: string;
  imageBaseUrl: string;
  build: Pick<Build, "id" | "version">;
  authToken?: string;
  authPermit: AuthPermit;
  authTokenPermissions: TokenPermissions;
  userPlanFeatures: UserPlanFeatures;
};

export const Builder = ({
  project,
  publisherHost,
  imageBaseUrl,
  build,
  authToken,
  authPermit,
  userPlanFeatures,
  authTokenPermissions,
}: BuilderProps) => {
  useMount(initBuilderApi);

  useMount(() => {
    // additional data stores
    $project.set(project);
    $publisherHost.set(publisherHost);
    $imageLoader.set(createImageLoader({ imageBaseUrl }));
    $authPermit.set(authPermit);
    $authToken.set(authToken);
    $userPlanFeatures.set(userPlanFeatures);
    $authTokenPermissions.set(authTokenPermissions);

    const controller = new AbortController();

    $dataLoadingState.set("loading");
    loadBuilderData({ projectId: project.id, signal: controller.signal })
      .then((data) => {
        setBuilderData(data);
        startProjectSync({
          projectId: project.id,
          buildId: build.id,
          version: build.version,
          authPermit,
          authToken,
        });
        updateWebstudioData((data) => {
          migrateWebstudioDataMutable(data);
        });

        // render canvas only after all data is loaded
        // so builder is started listening for connect event
        // when canvas is rendered
        $dataLoadingState.set("loaded");
      })
      .catch((error) => {
        console.error(error);
        // @todo make needs error handling and error state? e.g. a toast
        $dataLoadingState.set("idle");
      });
    return () => {
      $dataLoadingState.set("idle");
      controller.abort("unmount");
    };
  });

  useToastErrors();
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

  useBuilderStore();
  useSyncServer({
    projectId: project.id,
    authPermit,
  });
  const isCloneDialogOpen = useStore($isCloneDialogOpen);
  const isPreviewMode = useStore($isPreviewMode);
  const isDesignMode = useStore($isDesignMode);
  const isContentMode = useStore($isContentMode);

  const { onRef: onRefReadCanvas, onTransitionEnd } = useReadCanvasRect();

  useSetWindowTitle();

  const iframeRefCallback = mergeRefs((element: HTMLIFrameElement | null) => {
    if (element?.contentWindow) {
      // added to iframe window and stored in local variable right away to prevent
      // overriding in emebedded scripts on canvas
      element.contentWindow.__webstudioSharedSyncEmitter__ =
        builderClient.emitter;
    }
    onRefReadCanvas(element);
  }, publishRef);

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
    }

    if (isContentMode) {
      initCopyPasteForContentEditMode(abortController);
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

  /**
   * Prevents Lexical text editor from stealing focus during rendering.
   * Sets the inert attribute on the canvas body element and disables the text editor.
   *
   * This must be done synchronously to avoid the following issue:
   *
   * 1. Text editor is in edit state.
   * 2. User focuses on the builder (e.g., clicks any input).
   * 3. The text editor blur event triggers, causing a rerender on data change (data saved in onBlur).
   * 4. Text editor rerenders, stealing focus from the builder.
   * 5. Inert attribute is set asynchronously, but focus is already lost.
   *
   * Synchronous focusing and setInert prevent the text editor from focusing on render.
   * This cannot be handled inside the canvas because the text editor toolbar is in the builder and focus events in the canvas should be ignored.
   *
   * Use onPointerDown instead of onFocus because Radix focus lock triggers on text edit blur
   * before the focusin event when editing text inside a Radix dialog.
   */
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    // Ignore toolbar focus events. See the onFocus handler in text-toolbar.tsx
    if (false === event.defaultPrevented) {
      canvasApi.setInert();
      $textEditingInstanceSelector.set(undefined);
    }
  }, []);

  /**
   * Prevent Radix from stealing focus during editing in the style sources
   * For example, when the user select or create new style source item inside a dialog.
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement) {
      canvasApi.setInert();
    }
  }, []);

  /**
   * Prevent Radix from stealing focus during editing in the settings panel.
   * For example, when the user modifies the text content of an H1 element inside a dialog.
   */
  const handleInput = useCallback(() => {
    canvasApi.setInert();
  }, []);

  return (
    <TooltipProvider>
      <div
        style={{ display: "contents" }}
        onPointerDown={handlePointerDown}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      >
        <ChromeWrapper
          isPreviewMode={isPreviewMode}
          navigatorLayout={navigatorLayout}
        >
          <ProjectSettings />
          <Topbar
            project={project}
            hasProPlan={userPlanFeatures.hasProPlan}
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
          <SidePanel gridArea="sidebar">
            <SidebarLeft publish={publish} />
          </SidePanel>
          <Main>
            <Workspace onTransitionEnd={onTransitionEnd}>
              {dataLoadingState === "loaded" && (
                <CanvasIframe
                  ref={iframeRefCallback}
                  src={canvasUrl}
                  title={project.title}
                />
              )}
            </Workspace>

            {isDesignMode && <AiCommandBar />}
          </Main>
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
          {isPreviewMode === false && <Footer />}
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
        </ChromeWrapper>
        <Loading state={loadingState} />
        <BlockingAlerts />
        <CommandPanel />
      </div>
    </TooltipProvider>
  );
};
