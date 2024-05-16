import { useStore } from "@nanostores/react";
import { theme, Toaster, css } from "@webstudio-is/design-system";
import {
  $canvasWidth,
  $scale,
  $workspaceRect,
} from "~/builder/shared/nano-states";
import { $selectedInstanceSelector } from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { CanvasTools } from "./canvas-tools";
import { useEffect, useRef } from "react";
import { useSetCanvasWidth } from "../breakpoints";
import type { Breakpoint } from "@webstudio-is/sdk";
import { calcCanvasWidth } from "../breakpoints/calc-canvas-width";
import { isBaseBreakpoint } from "~/shared/breakpoints";

const workspaceStyle = css({
  flexGrow: 1,
  background: theme.colors.backgroundCanvas,
  position: "relative",
  // Prevent scrollIntoView from scrolling the whole page
  overflow: "clip",
  // This spacing is needed to still be able to grab the canvas edge, otherwise you will always drag
  // the browser window instead of the canvas.
  px: theme.spacing[5],
});

const canvasContainerStyle = css({
  position: "absolute",
  transformOrigin: "0 0",
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

/**
 * Used to prevent initial canvas width jump on wide screens.
 */
const getCanvasInitialMaxWidth = (
  initialBreakpoints: [Breakpoint["id"], Breakpoint][]
) => {
  const breakpoints = Array.from(new Map(initialBreakpoints).values());
  const selectedBreakpoint =
    breakpoints.find(isBaseBreakpoint) ?? initialBreakpoints[0]?.[1];

  if (selectedBreakpoint) {
    const initialWidth = calcCanvasWidth({
      breakpoints,
      selectedBreakpoint,
      // Just some reasonable initial guess, will be overwritten later as soon as detected.
      workspaceWidth: 2000,
    });
    return initialWidth;
  }
};

const getCanvasStyle = (
  initialBreakpoints: [Breakpoint["id"], Breakpoint][],
  scale: number,
  workspaceRect?: DOMRect,
  canvasWidth?: number
) => {
  let canvasHeight;

  if (workspaceRect?.height) {
    canvasHeight = workspaceRect.height / (scale / 100);
  }

  const maxWidth =
    canvasWidth === undefined
      ? getCanvasInitialMaxWidth(initialBreakpoints)
      : undefined;

  return {
    width: canvasWidth ?? "100%",
    height: canvasHeight ?? "100%",
    maxWidth,
    left: "50%",
    transform: `scale(${scale}%) translateX(-50%)`,
  };
};

const useCanvasStyle = (
  initialBreakpoints: [Breakpoint["id"], Breakpoint][]
) => {
  const scale = useStore($scale);
  const workspaceRect = useStore($workspaceRect);
  const canvasWidth = useStore($canvasWidth);

  return getCanvasStyle(initialBreakpoints, scale, workspaceRect, canvasWidth);
};

const useOutlineStyle = (
  initialBreakpoints: [Breakpoint["id"], Breakpoint][]
) => {
  const scale = useStore($scale);
  const workspaceRect = useStore($workspaceRect);
  const canvasWidth = useStore($canvasWidth);
  const style = getCanvasStyle(
    initialBreakpoints,
    100,
    workspaceRect,
    canvasWidth
  );

  return {
    ...style,
    pointerEvents: "none",
    width:
      canvasWidth === undefined ? "100%" : (canvasWidth ?? 0) * (scale / 100),
  } as const;
};

type WorkspaceProps = {
  children: JSX.Element;
  onTransitionEnd: () => void;
  initialBreakpoints: [Breakpoint["id"], Breakpoint][];
};

export const Workspace = ({
  children,
  onTransitionEnd,
  initialBreakpoints,
}: WorkspaceProps) => {
  const canvasStyle = useCanvasStyle(initialBreakpoints);
  const outlineStyle = useOutlineStyle(initialBreakpoints);
  const workspaceRef = useMeasureWorkspace();
  useSetCanvasWidth();
  const handleWorkspaceClick = () => {
    $selectedInstanceSelector.set(undefined);
    $textEditingInstanceSelector.set(undefined);
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
      </div>
      <div className={canvasContainerStyle()} style={outlineStyle}>
        <CanvasTools />
      </div>
      <Toaster />
    </div>
  );
};
