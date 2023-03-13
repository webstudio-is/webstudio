import { useStore } from "@nanostores/react";
import { theme, Box, Flex, Toaster } from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import type { Publish } from "~/shared/pubsub";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import {
  workspaceRectStore,
  zoomStore,
} from "~/shared/nano-states/breakpoints";
import { CanvasTools } from "./canvas-tools";
import { useMeasure } from "react-use";
import { useEffect } from "react";

const workspaceStyle = {
  flexGrow: 1,
  background: theme.colors.gray3,
  overflow: "scroll",
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
  overflow: "hidden",
};

const useSetWorkspaceRect = () => {
  const workspaceRect = useStore(workspaceRectStore);
  const [ref, rect] = useMeasure<HTMLDivElement>();
  useEffect(() => {
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    // Little lie to safe the trouble of importing the type it uses everywhere.
    workspaceRectStore.set(rect as DOMRect);
  }, [workspaceRect, rect]);
  return ref;
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
  const zoom = useStore(zoomStore);
  const [canvasWidth] = useCanvasWidth();
  const workspaceRef = useSetWorkspaceRect();

  const handleWorkspaceClick = () => {
    selectedInstanceSelectorStore.set(undefined);
  };

  return (
    <Box css={workspaceStyle} onClick={handleWorkspaceClick} ref={workspaceRef}>
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
