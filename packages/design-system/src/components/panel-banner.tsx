import { styled, theme } from "../stitches.config";
import { Box } from "./box";

export const PanelBanner = styled(Box, {
  display: "flex",
  gap: theme.spacing[7],
  flexDirection: "column",
  backgroundColor: theme.colors.backgroundInfoNotification,
  padding: theme.spacing[9],
});
