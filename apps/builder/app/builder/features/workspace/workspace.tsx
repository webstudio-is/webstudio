import { useEffect, useRef, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { theme, Toaster, css } from "@webstudio-is/design-system";
import {
  $canvasWidth,
  $scale,
  $workspaceRect,
} from "~/builder/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { CanvasTools } from "./canvas-tools";
import { useSetCanvasWidth } from "../breakpoints";
import { selectInstance } from "~/shared/awareness";

const workspaceStyle = css({
  flexGrow: 1,
  background: theme.colors.backgroundCanvas,
  position: "relative",
  // Prevent scrollIntoView from scrolling the whole page
  // Commented to see what it will break
  // overflow: "clip",
});

const canvasContainerStyle = css({
  position: "absolute",
  transformOrigin: "0 0",
  // We had a case where some Windows 10 + Chrome 129 users couldn't scroll iframe canvas.
  willChange: "transform",
});

const useMeasureWorkspace = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      $workspaceRect.set(entries[0].contentRect);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return ref;
};

const getCanvasStyle = (
  scale: number,
  workspaceRect?: DOMRect,
  canvasWidth?: number
) => {
  let canvasHeight;

  // For some reason scale is 0 in chrome dev tools mobile touch simulated vervsion.
  if (workspaceRect?.height && scale !== 0) {
    canvasHeight = workspaceRect.height / (scale / 100);
  }

  return {
    width: canvasWidth ?? "100%",
    height: canvasHeight ?? "100%",
    left: "50%",
    transform: `scale(${scale}%) translateX(-50%)`,
  };
};

const useCanvasStyle = () => {
  const scale = useStore($scale);
  const workspaceRect = useStore($workspaceRect);
  const canvasWidth = useStore($canvasWidth);

  return getCanvasStyle(scale, workspaceRect, canvasWidth);
};

const useOutlineStyle = () => {
  const scale = useStore($scale);
  const workspaceRect = useStore($workspaceRect);
  const canvasWidth = useStore($canvasWidth);
  const style = getCanvasStyle(100, workspaceRect, canvasWidth);

  return {
    ...style,
    pointerEvents: "none",
    width:
      canvasWidth === undefined ? "100%" : (canvasWidth ?? 0) * (scale / 100),
  } as const;
};

type WorkspaceProps = {
  children: ReactNode;
  onTransitionEnd: () => void;
};

export const Workspace = ({ children, onTransitionEnd }: WorkspaceProps) => {
  const canvasStyle = useCanvasStyle();
  const outlineStyle = useOutlineStyle();
  const workspaceRef = useMeasureWorkspace();
  useSetCanvasWidth();
  const handleWorkspaceClick = () => {
    selectInstance(undefined);
    $textEditingInstanceSelector.set(undefined);
  };

  return (
    <>
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
        </div>
        <div
          data-name="canvas-tools-wrapper"
          className={canvasContainerStyle()}
          style={outlineStyle}
        >
          <CanvasTools />
        </div>
      </div>
      <Toaster />
    </>
  );
};
