import { forwardRef } from "react";
import {
  type CSS,
  css,
  canvasPointerEventsPropertyName,
} from "@webstudio-is/design-system";
import { useUnmount } from "~/shared/hook-utils/use-mount";
import { $canvasIframeState } from "~/shared/nano-states";

const iframeStyle = css({
  border: "none",
  pointerEvents: `var(${canvasPointerEventsPropertyName})`,
});

type CanvasIframeProps = {
  css: CSS;
} & JSX.IntrinsicElements["iframe"];

export const CanvasIframe = forwardRef<HTMLIFrameElement, CanvasIframeProps>(
  ({ css, ...rest }, ref) => {
    useUnmount(() => {
      // Unmount does't work inside iframe.
      $canvasIframeState.set("idle");
    });

    return <iframe {...rest} ref={ref} className={iframeStyle({ css })} />;
  }
);

CanvasIframe.displayName = "CanvasIframe";
