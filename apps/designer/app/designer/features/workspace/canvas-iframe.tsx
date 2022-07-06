import { forwardRef } from "react";
import { CSS, css } from "apps/designer/app/shared/design-system";

const iframeStyle = css({
  border: "none",
  variants: {
    pointerEvents: {
      none: {
        pointerEvents: "none",
      },
      all: {
        pointerEvents: "all",
      },
    },
  },
});

type CanvasIframeProps = {
  pointerEvents: "all" | "none";
  css: CSS;
} & JSX.IntrinsicElements["iframe"];

export const CanvasIframe = forwardRef<HTMLIFrameElement, CanvasIframeProps>(
  ({ pointerEvents = "all", css, ...rest }, ref) => {
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
