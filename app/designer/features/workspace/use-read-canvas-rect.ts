import { useCallback, useEffect, useRef } from "react";
import { useCanvasRect } from "~/designer/shared/nano-values";

/**
 * Reads the canvas iframe dom rect and puts it into nano state
 * so that this is the only place we do it.
 */
export const useReadCanvasRect = () => {
  const iframeRef = useRef<HTMLIFrameElement>();
  const [, setCanvasRect] = useCanvasRect();

  const handleRef = useCallback((iframe: HTMLIFrameElement | null) => {
    if (iframe === null || iframeRef.current === iframe) return;
    iframeRef.current = iframe;
  }, []);

  const readRect = useCallback(() => {
    if (iframeRef.current === undefined) return;
    const rect = iframeRef.current.getBoundingClientRect();
    setCanvasRect(rect);
  }, [setCanvasRect]);

  useEffect(readRect, [readRect]);

  return {
    onRef: handleRef,
    onTransitionEnd: readRect,
  };
};
