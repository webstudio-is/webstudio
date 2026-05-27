import type { ReactNode } from "react";
import { css, theme, type CSS } from "../stitches.config";
import { textVariants } from "./text";

const pricingUrl = "https://webstudio.is/pricing";

const style = css(textVariants.labels, {
  display: "inline-grid",
  placeItems: "center",
  borderRadius: theme.borderRadius[3],
  px: theme.spacing[3],
  height: theme.spacing[9],
  color: theme.colors.foregroundContrastMain,
  alignItems: "center",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  // @todo doesn't work in tooltips, needs a workaround
  textOverflow: "ellipsis",
  background: theme.colors.foregroundTextSubtle,
  textDecoration: "none",
  cursor: "pointer",
  pointerEvents: "auto",
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: 1,
  },
  "@supports (text-box-trim: trim-both) and (text-box-edge: cap alphabetic)": {
    textBoxTrim: "trim-both",
    textBoxEdge: "cap alphabetic",
  },
});

export const ProBadge = ({
  css,
  children,
}: {
  children: ReactNode;
  css?: CSS;
}) => {
  return (
    <a
      className={style({ css })}
      href={pricingUrl}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
};
