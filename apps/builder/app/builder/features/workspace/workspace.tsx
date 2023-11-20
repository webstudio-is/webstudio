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
    transform: `scale(${scale}%) translateX(-50%)`,
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
