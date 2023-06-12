import { useStore } from "@nanostores/react";
import { theme, Toaster, css } from "@webstudio-is/design-system";
import {
  scaleStore,
  useCanvasWidth,
  workspaceRectStore,
} from "~/builder/shared/nano-states";
import type { Publish } from "~/shared/pubsub";
import {
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
} from "~/shared/nano-states";
import { textEditingInstanceSelectorStore } from "~/shared/nano-states";
import { CanvasTools } from "./canvas-tools";
import { useMeasure } from "react-use";
import { useEffect } from "react";
import { useSetCanvasWidth } from "../breakpoints";

const workspaceStyle = css({
  flexGrow: 1,
  background: theme.colors.backgroundCanvas,
  position: "relative",
  overflow: "hidden",
});

const canvasContainerStyle = css({
  position: "relative",
  transformStyle: "preserve-3d",
  transformOrigin: "0 0",
});

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

const getCanvasStyle = (
  scale: number,
  workspaceRect?: DOMRect,
  canvasWidth?: number
) => {
  let canvasHeight;

  if (workspaceRect?.height) {
    canvasHeight = workspaceRect.height / (scale / 100);
  }

  return {
    width: canvasWidth,
    height: canvasHeight ?? "100%",
    left: "50%",
    transform: `scale(${scale}%) translateX(-50%)`,
  };
};

const useCanvasStyle = () => {
  const scale = useStore(scaleStore);
  const workspaceRect = useStore(workspaceRectStore);
  const [canvasWidth] = useCanvasWidth();
  return getCanvasStyle(scale, workspaceRect, canvasWidth);
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
  const canvasStyle = useCanvasStyle();
  const workspaceRef = useSetWorkspaceRect();
  useSetCanvasWidth();
  const handleWorkspaceClick = () => {
    selectedInstanceSelectorStore.set(undefined);
    textEditingInstanceSelectorStore.set(undefined);
    selectedStyleSourceSelectorStore.set(undefined);
  };

  return (
    <div
      className={workspaceStyle()}
      onClick={handleWorkspaceClick}
      ref={workspaceRef}
    >
      <div
        className={canvasContainerStyle()}
        style={canvasStyle}
        onTransitionEnd={onTransitionEnd}
      >
        {children}
        <CanvasTools publish={publish} />
      </div>
      <Toaster />
    </div>
  );
};
