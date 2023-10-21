import { forwardRef, useEffect, useRef, useState } from "react";
import {
  type CSS,
  css,
  canvasPointerEventsPropertyName,
} from "@webstudio-is/design-system";
import { mergeRefs } from "@react-aria/utils";
import { registerIframe } from "~/shared/pubsub";

const iframeStyle = css({
  border: "none",
  pointerEvents: `var(${canvasPointerEventsPropertyName})`,
});

type CanvasIframeProps = {
  css: CSS;
} & JSX.IntrinsicElements["iframe"];

const PublishableIframe = forwardRef<HTMLIFrameElement, CanvasIframeProps>(
  ({ css, ...rest }, ref) => {
    const publishIframeRef = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
      const element = publishIframeRef.current;
      if (element) {
        return registerIframe(element);
      }
    }, []);
    return (
      <iframe
        {...rest}
        className={iframeStyle({ css })}
        ref={mergeRefs(ref, publishIframeRef)}
      />
    );
  }
);

export const CanvasIframe = forwardRef<HTMLIFrameElement, CanvasIframeProps>(
  (props, ref) => {
    // initialize canvas after builder is rendered
    // and synchronizatio is initialized
    const [isInitialized, setInitialized] = useState(false);
    useEffect(() => {
      setInitialized(true);
    }, []);
    return isInitialized && <PublishableIframe {...props} ref={ref} />;
  }
);

CanvasIframe.displayName = "CanvasIframe";
