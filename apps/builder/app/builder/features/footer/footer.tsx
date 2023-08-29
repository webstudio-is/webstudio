import { Flex, darkTheme } from "@webstudio-is/design-system";
import { Breadcrumbs } from "./breadcrumbs";
import { theme } from "@webstudio-is/design-system";

export const Footer = () => {
  return (
    <Flex
      className={darkTheme}
      as="footer"
      align="center"
      css={{
        gridArea: "footer",
        height: theme.spacing[11],
        background: theme.colors.loContrast,
        boxShadow: `inset 0 1px 0 0 ${theme.colors.panelOutline}`,
      }}
    >
      <Breadcrumbs />
    </Flex>
  );
};
