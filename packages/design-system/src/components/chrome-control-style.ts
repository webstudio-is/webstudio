import { cssVar } from "../css-var";
import type { CSS } from "../stitches.config";
import { focusRingStyle } from "./focus-ring";

const selectedSelector =
  '&[data-state="active"], &[data-state=on], &[data-state=open], &[aria-checked=true], &[aria-expanded=true]';

export const chromeControlStyle = {
  color: cssVar("--foreground-primary"),
  background: "transparent",
  "&[data-state=off], &[aria-checked=false]": {
    color: cssVar("--foreground-primary"),
  },
  "&:focus-visible": focusRingStyle(),
  "@hover": {
    "&:hover": {
      background: cssVar("--overlay-interaction-hover"),
    },
  },
  [selectedSelector]: {
    color: cssVar("--foreground-primary"),
    background: cssVar("--overlay-interaction-hover"),
  },
  "&:active": {
    background: cssVar("--overlay-interaction-pressed"),
  },
  "&:disabled, &[aria-disabled=true]": {
    color: cssVar("--foreground-disabled"),
    background: "transparent",
    cursor: "not-allowed",
  },
} satisfies CSS;
