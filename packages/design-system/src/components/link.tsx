import { forwardRef } from "react";
import { styled } from "../stitches.config";
import { textVariants } from "./text";
import { ExternalLinkIcon } from "@webstudio-is/icons";
import { cssVar } from "../css-var";

const moreSubtleForeground = `color-mix(in oklab, ${cssVar(
  "--foreground-secondary"
)} 56%, ${cssVar("--foreground-disabled")})`;
const contrastForeground = `light-dark(${cssVar(
  "--foreground-on-inverse"
)}, ${cssVar("--foreground-primary")})`;

export const IconLink = forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof Link> & { size?: number | string }
>(({ size, ...props }, ref) => (
  <Link {...props} ref={ref}>
    <ExternalLinkIcon size={size} />
  </Link>
));

export const Link = styled("a", {
  cursor: "pointer",
  "&[aria-disabled=true]": {
    cursor: "default",
    color: cssVar("--foreground-disabled"),
    "&:hover, &:visited": {
      color: cssVar("--foreground-disabled"),
    },
  },
  "&:focus-visible": {
    outline: `1px solid ${cssVar("--border-focus")}`,
  },
  variants: {
    variant: {
      inherit: {
        fontFamily: "inherit",
        fontWeight: "inherit",
        fontSize: "inherit",
        lineHeight: "inherit",
        letterSpacing: "inherit",
        textTransform: "inherit",
        textIndent: "inherit",
        textDecoration: "underline",
      },
      regular: textVariants.regularLink,
      label: textVariants.labelLink,
      mono: textVariants.monoLink,
      monoBold: textVariants.monoBoldLink,
    },
    color: {
      main: {
        color: cssVar("--foreground-primary"),
        "&:hover, &:visited": { color: cssVar("--foreground-primary") },
      },
      contrast: {
        color: contrastForeground,
        "&:hover, &:visited": { color: contrastForeground },
      },
      subtle: {
        color: cssVar("--foreground-muted"),
        "&:hover, &:visited": { color: cssVar("--foreground-muted") },
      },
      moreSubtle: {
        color: moreSubtleForeground,
        "&:hover, &:visited": { color: moreSubtleForeground },
      },
      inherit: {
        color: "inherit",
        "&:hover, &:visited": { color: "inherit" },
      },
    },
    underline: {
      none: {
        textDecoration: "none",
        "&:hover": { textDecoration: "none" },
      },
      hover: {
        textDecoration: "none",
        "&:hover": { textDecoration: "underline" },
      },
      always: {
        textDecoration: "underline",
        "&:hover": { textDecoration: "underline" },
      },
    },
    stretched: {
      true: {
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
        },
      },
    },
  },
  defaultVariants: {
    variant: "regular",
    color: "main",
    underline: "always",
  },
});
