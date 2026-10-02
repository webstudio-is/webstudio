import {
  forwardRef,
  useMemo,
  useRef,
  useLayoutEffect,
  useState,
  useCallback,
  useEffect,
  type JSX,
  type RefObject,
} from "react";
import {
  canvasPointerEventsPropertyName,
  css,
  cssVar,
} from "@webstudio-is/design-system";
import { useUnmount } from "~/shared/hook-utils/use-mount";
import { $canvasIframeState, $selectedPageId } from "~/shared/nano-states";
import { getSyncClient } from "~/shared/sync/sync-client";
import {
  attachCanvasSyncEmitter,
  canvasRenderedEvent,
} from "~/shared/canvas-sync-bridge";
import {
  $scale,
  $canvasWidth,
  $canvasRect,
} from "~/builder/shared/nano-states";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { mergeRefs } from "@react-aria/utils";

const iframeStyle = css({
  border: "none",
  pointerEvents: cssVar(canvasPointerEventsPropertyName),
  height: "100%",
  width: "100%",
  // The canvas displays the authored page, whose initial canvas is white and
  // independent of the Builder chrome color scheme.
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

const CanvasFrame = ({
  pageId,
  src,
  title,
  isVisible,
  isInteractive,
  onReady,
  publishRef,
}: {
  pageId: string | undefined;
  src: string;
  title: string;
  isVisible: boolean;
  isInteractive: boolean;
  onReady: (pageId: string | undefined) => void;
  publishRef: (element: HTMLIFrameElement | null) => void;
}) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const disposeSyncEmitter = useRef<(() => void) | undefined>(undefined);
  const handleReady = useCallback(() => onReady(pageId), [onReady, pageId]);

  const setFrameRef = useCallback(
    (frame: HTMLIFrameElement | null) => {
      frameRef.current?.removeEventListener(canvasRenderedEvent, handleReady);
      disposeSyncEmitter.current?.();
      frameRef.current = frame;
      disposeSyncEmitter.current = undefined;
      if (frame) {
        const emitter = getSyncClient()?.emitter;
        if (emitter) {
          disposeSyncEmitter.current = attachCanvasSyncEmitter(frame, emitter);
        }
        frame.addEventListener(canvasRenderedEvent, handleReady);
      }
    },
    [handleReady]
  );

  useLayoutEffect(() => {
    if (isVisible) {
      publishRef(frameRef.current);
      return () => publishRef(null);
    }
  }, [isVisible, publishRef]);

  return (
    <CanvasIframe
      ref={setFrameRef}
      src={src}
      title={title}
      data-ws-page-id={pageId ?? ""}
      aria-hidden={!isVisible}
      tabIndex={isInteractive ? undefined : -1}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: isVisible ? 1 : 0,
        pointerEvents: isInteractive ? undefined : "none",
      }}
    />
  );
};

export const CanvasFrameSwitcher = ({
  pageId,
  src,
  title,
  publishRef,
}: {
  pageId: string | undefined;
  src: string;
  title: string;
  publishRef: (element: HTMLIFrameElement | null) => void;
}) => {
  const [visiblePageId, setVisiblePageId] = useState(pageId);
  const handleReady = useCallback((readyPageId: string | undefined) => {
    if (readyPageId === $selectedPageId.get()) {
      setVisiblePageId(readyPageId);
    }
  }, []);

  useUnmount(() => {
    // Cleanup from a detached Canvas document does not run reliably.
    $canvasIframeState.set("idle");
  });

  const displayedPageId =
    pageId === undefined ? undefined : (visiblePageId ?? pageId);
  const framePageIds =
    displayedPageId === pageId ? [pageId] : [displayedPageId, pageId];

  return framePageIds.map((framePageId) => (
    <CanvasFrame
      key={framePageId ?? ""}
      pageId={framePageId}
      src={src}
      title={title}
      isVisible={framePageId === displayedPageId}
      isInteractive={framePageId === pageId && framePageId === displayedPageId}
      onReady={handleReady}
      publishRef={publishRef}
    />
  ));
};
