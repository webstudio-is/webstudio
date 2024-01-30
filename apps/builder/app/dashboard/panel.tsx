import { Flex, css, theme } from "@webstudio-is/design-system";
import type { ComponentProps } from "react";

const panelStyle = css({
  background: theme.colors.backgroundPanel,
  padding: theme.spacing[13],
  borderRadius: theme.borderRadius[6],
  color: theme.colors.foregroundMain,
  minWidth: "min-content",
  boxShadow: theme.shadows.brandElevationBig,
  flexGrow: 1,
});

export const Panel = (props: ComponentProps<typeof Flex>) => (
  <Flex direction="column" gap="5" className={panelStyle()} {...props} />
);
