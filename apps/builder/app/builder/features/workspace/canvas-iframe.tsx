import { forwardRef } from "react";
import {
  type CSS,
  css,
  canvasPointerEventsPropertyName,
} from "@webstudio-is/design-system";
import { useMount } from "~/shared/hook-utils/use-mount";
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
    useMount(() => {
      return () => {
        // We can't do this inside canvas as not event is triggered there
        $canvasIframeState.set("idle");
      };
    });

    return <iframe {...rest} ref={ref} className={iframeStyle({ css })} />;
  }
);

CanvasIframe.displayName = "CanvasIframe";
