import { styled, theme } from "../stitches.config";
import { Box } from "./box";

const iconColor = "--ws-panel-banner-icon-color";

export const panelBannerIconColor = `var(${iconColor})`;

export const PanelBanner = styled(Box, {
  display: "flex",
  gap: theme.spacing[7],
  flexDirection: "column",
  backgroundColor: theme.colors.backgroundInfoNotification,
  padding: theme.panel.padding,
  [iconColor]: theme.colors.foregroundInfo,

  variants: {
    variant: {
      info: {},
      warning: {
        backgroundColor: theme.colors.backgroundAlertNotification,
        [iconColor]: theme.colors.backgroundAlertMain,
      },
      error: {
        backgroundColor: theme.colors.backgroundDestructiveNotification,
        [iconColor]: theme.colors.foregroundDestructive,
      },
      success: {
        backgroundColor: theme.colors.backgroundSuccessNotification,
        [iconColor]: theme.colors.foregroundSuccess,
      },
      neutral: {
        backgroundColor: theme.colors.backgroundNeutralNotification,
        [iconColor]: theme.colors.foregroundMain,
      },
    },
  },
});
