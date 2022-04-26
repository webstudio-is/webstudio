import { useEffect } from "react";
import {
  useSelectedBreakpoint,
  useCanvasWidth,
} from "~/designer/shared/nano-values";
import { minWidth } from "./width-setting";

export const useUpdateCanvasWidth = () => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const [, setCanvasWidth] = useCanvasWidth();

  useEffect(() => {
    if (selectedBreakpoint === undefined || selectedBreakpoint.minWidth === 0) {
      return setCanvasWidth();
    }

    return setCanvasWidth(Math.max(selectedBreakpoint.minWidth, minWidth));
  }, [selectedBreakpoint, setCanvasWidth]);
};
