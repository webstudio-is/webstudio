import { useStore } from "@nanostores/react";
import { theme, Toaster, css } from "@webstudio-is/design-system";
import {
  scaleStore,
  useCanvasWidth,
  workspaceRectStore,
} from "~/builder/shared/nano-states";
import {
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
} from "~/shared/nano-states";
import { textEditingInstanceSelectorStore } from "~/shared/nano-states";
import { CanvasTools } from "./canvas-tools";
import { useEffect, useRef } from "react";
import { useSetCanvasWidth } from "../breakpoints";
import type { Breakpoint } from "@webstudio-is/sdk";
import { findInitialWidth } from "../breakpoints/find-initial-width";
import { isBaseBreakpoint } from "~/shared/breakpoints";

const workspaceStyle = css({
  flexGrow: 1,
  background: theme.colors.backgroundCanvas,
  position: "relative",
  // Prevent scrollIntoView from scrolling the whole page
  overflow: "clip",
});

const canvasContainerStyle = css({
  position: "absolute",
  transformStyle: "preserve-3d",
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
      workspaceRectStore.set(entries[0].contentRect);
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
  const breakpointsArray = [...new Map(initialBreakpoints).values()];
  const initialSelectedBreakpoint =
    breakpointsArray.find(isBaseBreakpoint) ?? initialBreakpoints[0]?.[1];

  if (initialSelectedBreakpoint) {
    const initialWidth = findInitialWidth(
      [...new Map(initialBreakpoints).values()],
      initialSelectedBreakpoint,
      Number.POSITIVE_INFINITY
    );
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

const useCanvasStyle = (
  initialBreakpoints: [Breakpoint["id"], Breakpoint][]
) => {
  const scale = useStore(scaleStore);
  const workspaceRect = useStore(workspaceRectStore);
  const [canvasWidth] = useCanvasWidth();

  return getCanvasStyle(initialBreakpoints, scale, workspaceRect, canvasWidth);
};

const useOutlineStyle = (
  initialBreakpoints: [Breakpoint["id"], Breakpoint][]
) => {
  const scale = useStore(scaleStore);
  const workspaceRect = useStore(workspaceRectStore);
  const [canvasWidth] = useCanvasWidth();
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
      </div>
      <div className={canvasContainerStyle()} style={outlineStyle}>
        <CanvasTools />
      </div>
      <Toaster />
    </div>
  );
};
