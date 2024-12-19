import { forwardRef, useMemo, useRef, type JSX, type RefObject } from "react";
import {
  css,
  canvasPointerEventsPropertyName,
} from "@webstudio-is/design-system";
import { useUnmount } from "~/shared/hook-utils/use-mount";
import { $canvasIframeState } from "~/shared/nano-states";
import { useCallback, useEffect, useState } from "react";
import {
  $scale,
  $canvasWidth,
  $canvasRect,
} from "~/builder/shared/nano-states";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { mergeRefs } from "@react-aria/utils";

const iframeStyle = css({
  border: "none",
  pointerEvents: `var(${canvasPointerEventsPropertyName})`,
  height: "100%",
  width: "100%",
  backgroundColor: "#fff",
});

type CanvasIframeProps = JSX.IntrinsicElements["iframe"];

const CanvasRectUpdater = ({
  iframeRef,
}: {
  iframeRef: RefObject<null | HTMLIFrameElement>;
}) => {
  const [updateCallback, setUpdateCallback] = useState<
    undefined | (() => void)
  >(undefined);

  useEffect(() => {
    updateCallback?.();
  }, [updateCallback]);

  const updateRect = useCallback(() => {
    // create new function to trigger effect
    const task = () => {
      if (iframeRef.current === null) {
        return;
      }

      const rect = iframeRef.current.getBoundingClientRect();

      $canvasRect.set(
        new DOMRect(
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.width),
          Math.round(rect.height)
        )
      );
    };

    setUpdateCallback(() => task);
  }, [iframeRef]);

  useEffect(() => {
    updateRect();
    const $scaleUnsubscribe = $scale.listen(updateRect);
    const $canvasWidthUnsubscribe = $canvasWidth.listen(updateRect);

    return () => {
      $scaleUnsubscribe();
      $canvasWidthUnsubscribe();
    };
  }, [updateRect]);

  useWindowResizeDebounced(() => {
    updateRect();
  });

  return null;
};

export const CanvasIframe = forwardRef<HTMLIFrameElement, CanvasIframeProps>(
  (props, ref) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const merrgedRef = useMemo(() => mergeRefs(ref, iframeRef), [ref]);

    useUnmount(() => {
      // Unmount does't work inside iframe.
      $canvasIframeState.set("idle");
    });

    return (
      <>
        <iframe
          {...props}
          ref={merrgedRef}
          className={iframeStyle()}
          credentialless="true"
        />
        <CanvasRectUpdater iframeRef={iframeRef} />
      </>
    );
  }
);

CanvasIframe.displayName = "CanvasIframe";
