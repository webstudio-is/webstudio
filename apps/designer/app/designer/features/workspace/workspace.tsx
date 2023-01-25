import { Box, Flex, Toaster } from "@webstudio-is/design-system";
import { useCanvasWidth, useZoom } from "~/designer/shared/nano-states";
import { CanvasTools } from "./canvas-tools";
import { type Publish } from "~/shared/pubsub";
import { theme } from "@webstudio-is/design-system";
import { selectedInstanceIdStore } from "~/shared/nano-states";

const workspaceStyle = {
  flexGrow: 1,
  background: theme.colors.gray3,
  // scroll behaviour should be derived from the iframe
  overflow: "hidden",
  scrollbarGutter: "stable",
  position: "relative",
};

const zoomStyle = {
  transformStyle: "preserve-3d",
  transition: "transform 200ms ease-out",
  height: "100%",
  width: "100%",
};

const canvasContainerStyle = {
  position: "relative",
  height: "100%",
};

type WorkspaceProps = {
  children: JSX.Element;
  onTransitionEnd: () => void;
  publish: Publish;
};

export const Workspace = ({
  children,
  onTransitionEnd,
  publish,
}: WorkspaceProps) => {
  const [zoom] = useZoom();
  const [canvasWidth] = useCanvasWidth();

  const handleWorkspaceClick = () => {
    selectedInstanceIdStore.set(undefined);
  };

  return (
    <Box css={workspaceStyle} onClick={handleWorkspaceClick}>
      <Flex
        direction="column"
        align="center"
        css={zoomStyle}
        style={{ transform: `scale(${zoom / 100})` }}
        onTransitionEnd={onTransitionEnd}
      >
        <Box css={canvasContainerStyle} style={{ width: canvasWidth }}>
          {children}
          <CanvasTools publish={publish} />
        </Box>
      </Flex>
      <Toaster />
    </Box>
  );
};
