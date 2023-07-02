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
  // Prevent scrollIntoView from scrolling the whole page
  overflow: "clip",
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
    // Chrome on Windows has a bug and makes everything slightly blurry if scale(1) is used together with translateX.
    // We have done a lot of comparisons between various fixes and they were producing slightly different sharpness,
    // using scale 0.9999 with opacity 0.9999 works best.
    // User Agent Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36
    // Edition    Windows 11 Home
    // Version    22H2
    // Installed on    ‎10/‎18/‎2022
    // OS build    22621.1848
    // Experience    Windows Feature Experience Pack 1000.22642.1000.0
    transform: `scale(${scale === 1 ? 0.9999 : scale}%) translateX(-50%)`,
    opacity: 0.9999,
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
