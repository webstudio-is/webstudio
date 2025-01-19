import { Flex, css, theme } from "@webstudio-is/design-system";
import type { ComponentProps } from "react";

const panelStyle = css({
  padding: theme.spacing[13],
  flexGrow: 1,
});

export const Panel = (props: ComponentProps<typeof Flex>) => (
  <Flex direction="column" gap="5" className={panelStyle()} {...props} />
);
