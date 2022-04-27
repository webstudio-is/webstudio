import { useCallback } from "react";
import { useCanvasWidth } from "../../shared/nano-values";

export const useInitialCanvasWidth = () => {
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();

  return useCallback(
    (iframe: HTMLIFrameElement | null) => {
      if (iframe === null || canvasWidth !== undefined) return;
      setCanvasWidth(iframe.getBoundingClientRect().width);
    },
    [canvasWidth, setCanvasWidth]
  );
};
