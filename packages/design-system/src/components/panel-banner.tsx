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
        [iconColor]: cssVar("--foreground-warning"),
      },
      error: {
        backgroundColor: cssVar("--background-negative-subtle"),
        [iconColor]: cssVar("--foreground-negative"),
      },
      success: {
        backgroundColor: cssVar("--background-positive-subtle"),
        [iconColor]: cssVar("--foreground-positive"),
      },
      neutral: {
        backgroundColor: cssVar("--background-secondary"),
        [iconColor]: cssVar("--foreground-primary"),
      },
    },
  },
});
