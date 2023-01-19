import { Box, css, theme } from "@webstudio-is/design-system";
import { type ComponentProps } from "react";

const panelStyle = css({
  background: theme.colors.backgroundPanel,
  padding: theme.spacing[13],
  margin: theme.spacing[13],
  borderRadius: theme.borderRadius[6],
  minWidth: 600,
  color: theme.colors.foregroundMain,
  // @todo - use theme
  //boxShadow: theme.boxShadow.brandElevationBig
});

export const Panel = (props: ComponentProps<typeof Box>) => (
  <Box className={panelStyle()} {...props} />
);
