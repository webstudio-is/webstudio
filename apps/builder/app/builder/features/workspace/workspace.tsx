import { useStore } from "@nanostores/react";
import { theme, Box, Toaster } from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import type { Publish } from "~/shared/pubsub";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import { textEditingInstanceSelectorStore } from "~/shared/nano-states/instances";
import {
  workspaceRectStore,
  scaleStore,
} from "~/shared/nano-states/breakpoints";
import { CanvasTools } from "./canvas-tools";
import { useMeasure } from "react-use";
import { useEffect } from "react";

const workspaceStyle = {
  flexGrow: 1,
  background: theme.colors.backgroundCanvas,
  position: "relative",
  overflow: "hidden",
};

const canvasContainerStyle = {
  position: "relative",
  overflow: "hidden",
  transformStyle: "preserve-3d",
  transformOrigin: "0 0",
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
  const scale = useStore(scaleStore);
  const workspaceRect = useStore(workspaceRectStore);
  const [canvasWidth] = useCanvasWidth();
  const workspaceRef = useSetWorkspaceRect();

  const handleWorkspaceClick = () => {
    selectedInstanceSelectorStore.set(undefined);
    textEditingInstanceSelectorStore.set(undefined);
  };

  let canvasHeight;
  let canvasLeft;

  if (workspaceRect?.height) {
    canvasHeight =
      workspaceRect.height + (workspaceRect.height * (100 - scale)) / 100;
  }

  if (workspaceRect?.width && canvasWidth) {
    canvasLeft = Math.max((workspaceRect.width - canvasWidth) / 2, 0);
  }

  return (
    <Box css={workspaceStyle} onClick={handleWorkspaceClick} ref={workspaceRef}>
      <Box
        css={canvasContainerStyle}
        style={{
          width: canvasWidth,
          height: canvasHeight ?? "100%",
          left: canvasLeft ?? 0,
          transform: `scale(${scale}%)`,
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {children}
        <CanvasTools publish={publish} />
      </Box>
      <Toaster />
    </Box>
  );
};
