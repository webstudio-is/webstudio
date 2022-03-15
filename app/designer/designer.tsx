import { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { Config } from "~/config";
import type { SelectedInstanceData } from "~/shared/component";
import type { Project } from "@webstudio-is/sdk";
import { Box, Grid, type CSS } from "~/shared/design-system";
import { SidebarLeft } from "./sidebar-left";
import { SidebarRight } from "./inspector";
import { Iframe, useSubscribe, usePublish } from "./iframe";
import { useIsPreviewMode, useRootInstance } from "./nano-values";
import { Topbar } from "./topbar";
import designerStyles from "./designer.css";
import interStyles from "~/shared/font-faces/inter.css";
import { useSync } from "./sync";

export const links = () => {
  return [
    { rel: "stylesheet", href: interStyles },
    { rel: "stylesheet", href: designerStyles },
  ];
};

const useSelectedComponentConfig = (): SelectedInstanceData | undefined => {
  const [selectedInstanceData, setSelectedInstanceData] =
    useState<SelectedInstanceData>();
  useSubscribe<"selectInstance", SelectedInstanceData>(
    "selectInstance",
    setSelectedInstanceData
  );
  return selectedInstanceData;
};

const useSubscribeRootInstance = () => {
  const [, setValue] = useRootInstance();
  useSubscribe<"loadRootInstance">("loadRootInstance", setValue);
};

type SidePanelProps = {
  children: JSX.Element;
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
      }}
    >
      {children}
    </Box>
  );
};

type ChromeWrapperProps = {
  children: Array<JSX.Element>;
  isPreviewMode: boolean;
};

const ChromeWrapper = ({ children, isPreviewMode }: ChromeWrapperProps) => {
  const gridLayout = isPreviewMode
    ? {
        gridTemplateColumns: "auto 1fr",
        gridTemplateRows: "auto 1fr",
        gridTemplateAreas: `
                "header header"
                "sidebar canvas"
              `,
      }
    : {
        gridTemplateColumns: "auto 1fr 240px",
        gridTemplateRows: "auto 1fr",
        gridTemplateAreas: `
                "header header header"
                "sidebar canvas inspector"
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
};

export const Designer = ({ config, project }: DesignerProps) => {
  const [isDragging, setIsDragging] = useState<boolean>();
  const selectedInstanceData = useSelectedComponentConfig();
  const [publish, iframeRef] = usePublish();
  const [isPreviewMode] = useIsPreviewMode();
  useSync({ config, project });
  useSubscribeRootInstance();
  return (
    <DndProvider backend={HTML5Backend}>
      <ChromeWrapper isPreviewMode={isPreviewMode}>
        <SidePanel gridArea="sidebar" isPreviewMode={isPreviewMode}>
          <SidebarLeft
            iframeRef={iframeRef}
            onDragChange={setIsDragging}
            publish={publish}
            selectedInstanceData={selectedInstanceData}
          />
        </SidePanel>
        <Topbar
          css={{ gridArea: "header" }}
          config={config}
          project={project}
          publish={publish}
        />
        <Iframe
          ref={iframeRef}
          src={`${config.canvasPath}/${project.id}`}
          pointerEvents={isDragging ? "none" : "all"}
          title={project.title}
        />
        <SidePanel
          gridArea="inspector"
          isPreviewMode={isPreviewMode}
          css={{ overflow: "hidden" }}
        >
          <SidebarRight
            publish={publish}
            selectedInstanceData={selectedInstanceData}
          />
        </SidePanel>
      </ChromeWrapper>
    </DndProvider>
  );
};
