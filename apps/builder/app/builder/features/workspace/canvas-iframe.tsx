import { forwardRef } from "react";
import {
  css,
  canvasPointerEventsPropertyName,
} from "@webstudio-is/design-system";
import { useUnmount } from "~/shared/hook-utils/use-mount";
import { $canvasIframeState } from "~/shared/nano-states";

const iframeStyle = css({
  border: "none",
  pointerEvents: `var(${canvasPointerEventsPropertyName})`,
  height: "100%",
  width: "100%",
  backgroundColor: "#fff",
});

type CanvasIframeProps = JSX.IntrinsicElements["iframe"];

export const CanvasIframe = forwardRef<HTMLIFrameElement, CanvasIframeProps>(
  (props, ref) => {
    useUnmount(() => {
      // Unmount does't work inside iframe.
      $canvasIframeState.set("idle");
    });

    return <iframe {...props} ref={ref} className={iframeStyle()} />;
  }
);

CanvasIframe.displayName = "CanvasIframe";
