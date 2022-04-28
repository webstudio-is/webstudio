import { useSubscribe } from "~/designer/shared/canvas-iframe";
import {
  useBreakpoints,
  useScale,
  useSelectedBreakpoint,
} from "../../shared/nano-values";
import { sort } from "./sort";
import { minScale } from "./scale-setting";

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

const scaleStep = 20;

export const useSubscribeScaleFromShortcut = () => {
  const [scale, setScale] = useScale();
  useSubscribe<"scale", "scaleIn" | "scaleOut">("scale", (direction) => {
    if (direction === "scaleIn") {
      setScale(Math.min(scale + scaleStep, 100));
      return;
    }

    setScale(Math.max(scale - scaleStep, minScale));
  });
};
