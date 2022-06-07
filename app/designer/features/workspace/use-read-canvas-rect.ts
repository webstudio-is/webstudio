import { useCallback, useEffect, useState } from "react";
import { useZoom } from "~/designer/shared/nano-states";
import { useCanvasRect, useCanvasWidth } from "~/designer/shared/nano-states";

/**
 * Reads the canvas iframe dom rect and puts it into nano state
 * so that this is the only place we do it.
 */
export const useReadCanvasRect = () => {
  const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>(
    null
  );
  const [, setCanvasRect] = useCanvasRect();
  const [canvasWidth] = useCanvasWidth();
  const [zoom] = useZoom();

  const readRect = useCallback(
    () => {
      if (iframeElement === null) return;
      requestAnimationFrame(() => {
        const rect = iframeElement.getBoundingClientRect();
        setCanvasRect(rect);
      });
    },
    // canvasWidth will change the canvas width, so we need to React it to it and update the rect, even though we don't necessary usenthe value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iframeElement, setCanvasRect, canvasWidth, zoom]
  );

  useEffect(readRect, [readRect]);

  return {
    onRef: setIframeElement,
    onTransitionEnd: readRect,
  };
};
