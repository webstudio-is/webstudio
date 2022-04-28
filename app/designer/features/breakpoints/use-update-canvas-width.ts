import { useCallback, useEffect, useRef } from "react";
import {
  useSelectedBreakpoint,
  useCanvasWidth,
} from "~/designer/shared/nano-values";
import { minWidth } from "./width-setting";

export const useUpdateCanvasWidth = () => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const initialCanvasWidthRef = useRef<number>();

  useEffect(() => {
    if (selectedBreakpoint === undefined) {
      return;
    }

    if (selectedBreakpoint.minWidth === 0) {
      setCanvasWidth(initialCanvasWidthRef.current);
      return;
    }

    setCanvasWidth(Math.max(selectedBreakpoint.minWidth, minWidth));
  }, [selectedBreakpoint, setCanvasWidth]);

  return useCallback(
    (iframe: HTMLIFrameElement | null) => {
      if (iframe === null || canvasWidth !== undefined) return;
      initialCanvasWidthRef.current = Math.round(
        iframe.getBoundingClientRect().width
      );
      setCanvasWidth(initialCanvasWidthRef.current);
    },
    [canvasWidth, setCanvasWidth]
  );
};
