import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { usePublish, $publisher } from "~/shared/pubsub";
import type { Build } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import {
  theme,
  Box,
  type CSS,
  Flex,
  Grid,
  Progress,
} from "@webstudio-is/design-system";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { createImageLoader } from "@webstudio-is/image";
import { registerContainers, useBuilderStore } from "~/shared/sync";
import { startProjectSync, useSyncServer } from "./shared/sync/sync-server";
import {
  SidebarLeft,
  NavigatorContent,
  useNavigatorLayout,
} from "./features/sidebar-left";
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
  $selectedInstanceRenderState,
  $canvasIframeState,
} from "~/shared/nano-states";
import { type Settings } from "./shared/client-settings";
import { getBuildUrl } from "~/shared/router-utils";
import { useCopyPaste } from "~/shared/copy-paste";
import { BlockingAlerts } from "./features/blocking-alerts";
import { useSyncPageUrl } from "~/shared/pages";
import { useMount, useUnmount } from "~/shared/hook-utils/use-mount";
import { subscribeCommands } from "~/builder/shared/commands";
import { AiCommandBar } from "./features/ai/ai-command-bar";
import { ProjectSettings } from "./features/project-settings";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import { $isCloneDialogOpen, $userPlanFeatures } from "./shared/nano-states";
import { CloneProjectDialog } from "~/shared/clone-project";
import type { TokenPermissions } from "@webstudio-is/authorization-token";
import { useToastErrors } from "~/shared/error/toast-error";
import { canvasApi } from "~/shared/canvas-api";
import { loadBuilderData, setBuilderData } from "~/shared/builder-data";
import { WebstudioIcon } from "@webstudio-is/icons";
import { atom, computed } from "nanostores";
import { useInterval } from "~/shared/hook-utils/use-interval";

registerContainers();

const $dataLoadingState = atom<"idle" | "loading" | "loaded">("idle");

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
        bc: theme.colors.backgroundPanel,
        height: "100%",
        "&:last-of-type": {
          // Ensure content still has full width, avoid subpixels give layout round numbers
          boxShadow: `inset 1px 0 0 0 ${theme.colors.borderMain}`,
        },
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
  css: CSS;
};

const NavigatorPanel = ({
  isPreviewMode,
  navigatorLayout,
  css,
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
          ...css,
        }}
      >
        <NavigatorContent isClosable={false} />
      </Box>
    </SidePanel>
  );
};

const revealAnimation = ({
  show,
  backgroundColor,
}: {
  show: boolean;
  backgroundColor: string;
}): CSS => ({
  position: "relative",
  "> ::after": {
    content: "",
    position: "absolute",
    inset: 0,
    zIndex: 1,
    transitionDuration: "300ms",
    pointerEvents: "none",
    transitionProperty: "opacity",
    backgroundColor,
    opacity: show ? 0 : 1,
  },
});

const $loadingState = computed(
  [
    $dataLoadingState,
    $selectedInstanceRenderState,
    $canvasIframeState,
    $isPreviewMode,
  ],
  (
    dataLoadingState,
    selectedInstanceRenderState,
    canvasIframeState,
    isPreviewMode
  ) => {
    type State =
      | "dataLoadingState"
      | "selectedInstanceRenderState"
      | "canvasIframeState";

    const readyStates = new Map<State, boolean>([
      ["dataLoadingState", dataLoadingState === "loaded"],
      [
        "selectedInstanceRenderState",
        selectedInstanceRenderState === "mounted" || isPreviewMode,
      ],
      ["canvasIframeState", canvasIframeState === "ready"],
    ]);
    const readyCount = Array.from(readyStates.values()).filter(Boolean).length;
    const progress = Math.round((readyCount / readyStates.size) * 100);
    const state = readyCount === readyStates.size ? "ready" : "loading";

    return { state, progress, readyStates };
  }
);

const ProgressIndicator = ({ value }: { value: number }) => {
  const [fakeValue, setFakeValue] = useState(value);
  // A maximum fake value we can grow to if the value is still 0, so that we don't get stuck at 0%.
  const defaultFakeValueLimit = 50;

  // This is an approximation of a real progress that should come from "value".
  useInterval((timerId) => {
    if (value >= 100) {
      clearInterval(timerId);
      return;
    }
    setFakeValue((fakeValue) => {
      fakeValue++;
      // - When real value is 0, we don't want to use it, because we don't want to get stuck at 0.
      // - When real value is smaller than fake value, we don't want to use it because that would jump the progress back.
      const minFakeValue =
        value === 0 || value < fakeValue ? defaultFakeValueLimit : value;
      return Math.min(fakeValue, minFakeValue);
    });
  }, 50);

  if (value >= 100) {
    return;
  }

  return (
    <Flex
      direction="column"
      gap="3"
      css={{
        position: "absolute",
        inset: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
      }}
    >
      <WebstudioIcon
        size={60}
        style={{
          filter: `
            drop-shadow(3px 3px 6px rgba(0, 0, 0, 0.7)) 
            brightness(${fakeValue}%)
          `,
        }}
      />
      <Progress value={fakeValue} />
    </Flex>
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
        // render canvas only after all data is loaded
        // so builder is started listening for connect event
        // when canvas is rendered
        $dataLoadingState.set("loaded");
      })
      .catch(() => {
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

  useBuilderStore(publish);
  useSyncServer({
    projectId: project.id,
    authPermit,
  });
  const isCloneDialogOpen = useStore($isCloneDialogOpen);
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
  const dataLoadingState = useStore($dataLoadingState);
  const loadingState = useStore($loadingState);

  const canvasUrl = getBuildUrl({
    project,
  });

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
      >
        <ChromeWrapper isPreviewMode={isPreviewMode}>
          <ProjectSettings />
          <Topbar
            project={project}
            hasProPlan={userPlanFeatures.hasProPlan}
            css={{
              gridArea: "header",
              ...revealAnimation({
                // Looks nicer when topbar is already visible earlier, so user has more sense of progress.
                show: loadingState.readyStates.get("dataLoadingState") ?? false,
                backgroundColor: theme.colors.backgroundTopbar,
              }),
            }}
          />
          <Main>
            <Workspace
              onTransitionEnd={onTransitionEnd}
              css={revealAnimation({
                show: loadingState.state === "ready",
                backgroundColor: theme.colors.backgroundCanvas,
              })}
            >
              {dataLoadingState === "loaded" && (
                <CanvasIframe
                  ref={iframeRefCallback}
                  src={canvasUrl}
                  title={project.title}
                />
              )}
            </Workspace>
            <AiCommandBar isPreviewMode={isPreviewMode} />
          </Main>
          <NavigatorPanel
            isPreviewMode={isPreviewMode}
            navigatorLayout={navigatorLayout}
            css={revealAnimation({
              show: loadingState.state === "ready",
              backgroundColor: theme.colors.backgroundPanel,
            })}
          />
          <SidePanel
            gridArea="sidebar"
            css={revealAnimation({
              show: loadingState.state === "ready",
              backgroundColor: theme.colors.backgroundPanel,
            })}
          >
            <SidebarLeft publish={publish} />
          </SidePanel>
          <SidePanel
            gridArea="inspector"
            isPreviewMode={isPreviewMode}
            css={{
              overflow: "hidden",
              ...revealAnimation({
                show: loadingState.state === "ready",
                backgroundColor: theme.colors.backgroundPanel,
              }),
            }}
          >
            <Inspector navigatorLayout={navigatorLayout} />
          </SidePanel>
          {isPreviewMode === false && <Footer />}
          <BlockingAlerts />
          <CloneProjectDialog
            isOpen={isCloneDialogOpen}
            onOpenChange={$isCloneDialogOpen.set}
            project={project}
          />
        </ChromeWrapper>
        <ProgressIndicator value={loadingState.progress} />
      </div>
    </TooltipProvider>
  );
};
