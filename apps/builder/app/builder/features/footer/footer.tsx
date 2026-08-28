import { Flex, theme } from "@webstudio-is/design-system";
import { Breadcrumbs } from "./breadcrumbs";
import {
  builderChromeBackground,
  builderChromeForeground,
} from "~/builder/shared/color-recipes";

export const Footer = () => {
  return (
    <Flex
      as="footer"
      align="center"
      css={{
        isolation: "isolate",
        gridArea: "footer",
        height: theme.spacing[11],
        background: builderChromeBackground,
        color: builderChromeForeground,
      }}
    >
      <Breadcrumbs />
    </Flex>
  );
};
