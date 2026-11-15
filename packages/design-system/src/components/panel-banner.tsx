import { styled, theme } from "../stitches.config";
import { Box } from "./box";
import { cssVar, declareCssVar } from "../css-var";

const iconColor = declareCssVar("--panel-banner-icon-color");

export const panelBannerIconColor = cssVar(iconColor);

export const PanelBanner = styled(Box, {
  display: "flex",
  gap: theme.spacing[7],
  flexDirection: "column",
  backgroundColor: cssVar("--background-informative-subtle"),
  padding: theme.panel.padding,
  [iconColor]: cssVar("--foreground-informative"),

  variants: {
    variant: {
      info: {},
      warning: {
        backgroundColor: cssVar("--background-warning-subtle"),
        boxShadow: `inset 0 0 0 1px light-dark(transparent, ${cssVar(
          "--border-warning"
        )})`,
        [iconColor]: cssVar("--foreground-warning"),
      },
      error: {
        backgroundColor: cssVar("--background-negative-subtle"),
        boxShadow: `inset 0 0 0 1px light-dark(transparent, ${cssVar(
          "--background-negative"
        )})`,
        [iconColor]: cssVar("--foreground-negative"),
      },
      success: {
        backgroundColor: cssVar("--background-positive-subtle"),
        boxShadow: `inset 0 0 0 1px light-dark(transparent, ${cssVar(
          "--background-positive"
        )})`,
        [iconColor]: cssVar("--foreground-positive"),
      },
      neutral: {
        backgroundColor: cssVar("--background-secondary"),
        [iconColor]: cssVar("--foreground-primary"),
      },
    },
  },
});
