import { styled, css } from "../stitches.config";

export const overlayStyles = css({
  backgroundColor: "rgba(0, 0, 0, .15)",
});

export const Overlay = styled("div", overlayStyles);
