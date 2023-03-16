import { forwardRef } from "react";
import { CSS, css } from "@webstudio-is/design-system";

const iframeStyle = css({
  border: "none",
  variants: {
    pointerEvents: {
      none: {
        pointerEvents: "none",
      },
      auto: {
        pointerEvents: "auto",
      },
    },
  },
});

type CanvasIframeProps = {
  pointerEvents: "auto" | "none";
  css: CSS;
} & JSX.IntrinsicElements["iframe"];

export const CanvasIframe = forwardRef<HTMLIFrameElement, CanvasIframeProps>(
  ({ pointerEvents = "auto", css, ...rest }, ref) => {
    return (
      <iframe
        {...rest}
        ref={ref}
        className={iframeStyle({ pointerEvents, css })}
      />
    );
  }
);

CanvasIframe.displayName = "CanvasIframe";
