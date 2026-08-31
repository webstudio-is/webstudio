import { styled, theme } from "../stitches.config";
import { textVariants } from "./text";
import { cssVar } from "../css-var";
import { rotateBoundedBackgroundHue } from "../color-utils";

const neutralBackground = `color-mix(in oklab, ${cssVar(
  "--foreground-primary"
)} 58%, ${cssVar("--background-primary")})`;
const purpleBackground = rotateBoundedBackgroundHue(
  cssVar("--background-accent"),
  72
);

export const Chip = styled("span", textVariants.labels, {
  boxSizing: "border-box",
  minWidth: 0,
  maxWidth: "100%",
  height: theme.spacing[9],
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  px: theme.spacing[3],
  borderRadius: theme.borderRadius[3],
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  userSelect: "none",
  fontVariantNumeric: "tabular-nums",
  textDecoration: "none",

  "&:focus-visible": {
    outline: `1px solid ${cssVar("--border-focus")}`,
    outlineOffset: "1px",
  },

  variants: {
    color: {
      neutral: {
        backgroundColor: neutralBackground,
        color: cssVar("--foreground-on-inverse"),
      },
      green: {
        backgroundColor: cssVar("--background-positive"),
        color: cssVar("--foreground-on-positive"),
      },
      purple: {
        backgroundColor: purpleBackground,
        color: cssVar("--foreground-on-accent"),
      },
    },
  },

  defaultVariants: {
    color: "neutral",
  },
});
