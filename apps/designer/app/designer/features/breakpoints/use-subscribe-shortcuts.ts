import { useSubscribe } from "~/shared/pubsub";
import { useBreakpoints } from "~/shared/nano-states";
import { useZoom, useSelectedBreakpoint } from "../../shared/nano-states";
import { minZoom } from "./zoom-setting";
import { utils } from "@webstudio-is/project";

export const useSubscribeSelectBreakpointFromShortcut = () => {
  const [breakpoints] = useBreakpoints();
  const [, setSelectedBreakpoint] = useSelectedBreakpoint();
  useSubscribe("selectBreakpointFromShortcut", (index) => {
    const breakpoint = utils.breakpoints.sort(breakpoints)[index - 1];
    if (breakpoint) setSelectedBreakpoint(breakpoint);
  });
};

const zoomStep = 20;

export const useSubscribeZoomFromShortcut = () => {
  const [zoom, setZoom] = useZoom();
  useSubscribe("zoom", (direction) => {
    if (direction === "zoomIn") {
      setZoom(Math.min(zoom + zoomStep, 100));
      return;
    }

    setZoom(Math.max(zoom - zoomStep, minZoom));
  });
};
