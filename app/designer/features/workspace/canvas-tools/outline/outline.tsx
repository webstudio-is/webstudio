import { styled } from "~/shared/design-system";

export const Outline = styled("div", {
  position: "absolute",
  pointerEvents: "none",
  outline: "2px solid $blue9",
  outlineOffset: -2,
  top: 0,
  left: 0,
});
