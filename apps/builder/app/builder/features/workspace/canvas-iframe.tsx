import { forwardRef, useEffect, useState } from "react";
import {
  type CSS,
  css,
  canvasPointerEventsPropertyName,
} from "@webstudio-is/design-system";

const iframeStyle = css({
  border: "none",
  pointerEvents: `var(${canvasPointerEventsPropertyName})`,
});

type CanvasIframeProps = {
  css: CSS;
} & JSX.IntrinsicElements["iframe"];

export const CanvasIframe = forwardRef<HTMLIFrameElement, CanvasIframeProps>(
  ({ css, ...rest }, ref) => {
    // initialize canvas after builder is rendered
    // and synchronizatio is initialized
    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
      setInitialized(true);
    }, []);
    return (
      initialized && (
        <iframe {...rest} ref={ref} className={iframeStyle({ css })} />
      )
    );
  }
);

CanvasIframe.displayName = "CanvasIframe";
