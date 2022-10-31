import { useSubscribe } from "~/shared/pubsub";
import { useBreakpoints } from "~/shared/nano-states";
import { useZoom, useSelectedBreakpoint } from "../../shared/nano-states";
import { minZoom } from "./zoom-setting";
import { utils } from "@webstudio-is/project";
import { shortcuts } from "~/shared/shortcuts";
import { useHotkeys } from "react-hotkeys-hook";

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

  // We need to prevent browser default behavior for zooming in/out
  // Maybe we should use shift modifier and keep the default behaivor functional?
  useHotkeys(
    shortcuts.zoom,
    (event) => {
      event.preventDefault();
    },
    []
  );

  useSubscribe("zoom", (direction) => {
    if (direction === "zoomIn") {
      setZoom(Math.min(zoom + zoomStep, 100));
      return;
    }

    setZoom(Math.max(zoom - zoomStep, minZoom));
  });
};
