import { styled, Box, theme } from "@webstudio-is/design-system";

export const Panel = styled(Box, {
  background: theme.colors.backgroundPanel,
  padding: theme.spacing[13],
  margin: theme.spacing[13],
  borderRadius: theme.borderRadius[6],
  minWidth: 600,
  color: theme.colors.foregroundMain,
  // @todo - use theme
  //boxShadow: theme.boxShadow.brandElevationBig
});
