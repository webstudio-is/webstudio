import { css, theme } from "../stitches.config";

export const baseItemCss = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontFamily: theme.fonts.sans,
  fontSize: theme.fontSize[3],
  fontVariantNumeric: "tabular-nums",
  lineHeight: "1",
  cursor: "default",
  userSelect: "none",
  whiteSpace: "nowrap",
  height: theme.spacing[11],
  px: theme.spacing[11],
});

export const itemCss = css(baseItemCss, {
  position: "relative",
  color: theme.colors.hiContrast,
  "&:focus, &[data-found], &[aria-selected=true]": {
    outline: "none",
    backgroundColor: theme.colors.blue10,
    color: "white",
  },
  "&[data-disabled], &[aria-disabled]": {
    color: theme.colors.slate9,
  },
});

export const labelCss = css(baseItemCss, {
  color: theme.colors.slate11,
});

export const menuCss = css({
  boxSizing: "border-box",
  minWidth: 120,
  py: theme.spacing[3],
});

export const separatorCss = css({
  height: 1,
  my: theme.spacing[3],
  backgroundColor: theme.colors.slate6,
});
