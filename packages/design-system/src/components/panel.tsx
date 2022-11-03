import { css, styled } from "../stitches.config";

export const panelStyles = css({
  overflow: "auto",
  backgroundColor: "$slate4",
  borderRadius: "$1",
  boxShadow:
    "0px 2px 7px rgba(0, 0, 0, 0.1), 0px 5px 17px rgba(0, 0, 0, 0.15), inset 0 0 1px 1px $colors$slate1, 0 0 0 1px $colors$slate7",
});

export const Panel = styled("div", panelStyles);
