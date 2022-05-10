import { useSubscribe } from "~/designer/shared/canvas-iframe";
import { sort } from "~/shared/breakpoints";
import {
  useBreakpoints,
  useZoom,
  useSelectedBreakpoint,
} from "../../shared/nano-values";
import { minZoom } from "./zoom-setting";

export const useSubscribeSelectBreakpointFromShortcut = () => {
  const [breakpoints] = useBreakpoints();
  const [, setSelectedBreakpoint] = useSelectedBreakpoint();
  useSubscribe<"selectBreakpointFromShortcut", number>(
    "selectBreakpointFromShortcut",
    (index) => {
      const breakpoint = sort(breakpoints)[index - 1];
      if (breakpoint) setSelectedBreakpoint(breakpoint);
    }
  );
};

const zoomStep = 20;

export const useSubscribeZoomFromShortcut = () => {
  const [zoom, setZoom] = useZoom();
  useSubscribe<"zoom", "zoomIn" | "zoomOut">("zoom", (direction) => {
    if (direction === "zoomIn") {
      setZoom(Math.min(zoom + zoomStep, 100));
      return;
    }

    setZoom(Math.max(zoom - zoomStep, minZoom));
  });
};
