import { forwardRef } from "react";
import { CSS, css } from "~/shared/design-system";

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
  src: string;
  title: string;
  css: CSS;
};

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
