import { useCallback, useState } from "react";
import { useSubscribe, usePublish } from "@webstudio-is/react-sdk";
import { type Project, type Asset } from "@webstudio-is/prisma-client";
import type { Config } from "~/config";
import type {
  HoveredInstanceData,
  SelectedInstanceData,
} from "~/shared/canvas-components";
import { Box, Flex, Grid, type CSS } from "~/shared/design-system";
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
import { Breadcrumbs } from "./features/breadcrumbs";
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
import { useSubscribeClientSetting } from "./shared/client-settings";

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

const useIsDragging = (): [boolean, (isDragging: boolean) => void] => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  useSubscribe<"dragStartInstance">("dragStartInstance", () => {
    setIsDragging(true);
  });
  useSubscribe<"dragEndInstance">("dragEndInstance", () => {
    setIsDragging(false);
  });
  return [isDragging, setIsDragging];
};

type SidePanelProps = {
  children: JSX.Element | Array<JSX.Element>;
  isPreviewMode: boolean;
  css?: CSS;
  gridArea: "inspector" | "sidebar";
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
          boxShadow: "inset -1px 0 0 0 $colors$gray7",
        },
        "&:last-of-type": {
          boxShadow: "inset 1px 0 0 0 $colors$gray7",
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
  children: Array<JSX.Element>;
  isPreviewMode: boolean;
};

const ChromeWrapper = ({ children, isPreviewMode }: ChromeWrapperProps) => {
  const gridLayout = isPreviewMode
    ? {
        gridTemplateColumns: "auto 1fr",
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: `
                "header header"
                "sidebar main"
                "footer footer"
              `,
      }
    : {
        gridTemplateColumns: "auto 1fr 240px",
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: `
                "header header header"
                "sidebar main inspector"
                "footer footer footer"
              `,
      };
  return (
    <Grid
      css={{
        height: "100vh",
        overflow: "hidden",
        display: "grid",
        ...gridLayout,
      }}
    >
      {children}
    </Grid>
  );
};

type DesignerProps = {
  config: Config;
  project: Project;
  assets: Array<Asset>;
};

export const Designer = ({ config, project, assets }: DesignerProps) => {
  useSubscribeSyncStatus();
  useSubscribeRootInstance();
  useSubscribeSelectedInstanceData();
  useSubscribeHoveredInstanceData();
  useSubscribeBreakpoints();
  useSubscribeClientSetting();
  const [publish, publishRef] = usePublish();
  const [isPreviewMode] = useIsPreviewMode();
  const [isDragging, setIsDragging] = useIsDragging();
  usePublishShortcuts(publish);
  const onRefReadCanvasWidth = useUpdateCanvasWidth();
  const { onRef: onRefReadCanvas, onTransitionEnd } = useReadCanvasRect();

  // @todo: useIsDragging propably should live here too eventually?
  const [dragAndDrop] = useDragAndDropState();

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
            pointerEvents={isDragging ? "none" : "all"}
            title={project.title}
            css={{
              height: "100%",
              width: "100%",
            }}
          />
        </Workspace>
      </Main>
      <SidePanel gridArea="sidebar" isPreviewMode={isPreviewMode}>
        <SidebarLeft
          assets={assets}
          onDragChange={setIsDragging}
          publish={publish}
        />
      </SidePanel>
      <SidePanel
        gridArea="inspector"
        isPreviewMode={isPreviewMode}
        css={{ overflow: "hidden" }}
      >
        {isDragging || dragAndDrop.isDragging ? (
          <TreePrevew />
        ) : (
          <Inspector publish={publish} />
        )}
      </SidePanel>
      <Breadcrumbs publish={publish} />
    </ChromeWrapper>
  );
};
