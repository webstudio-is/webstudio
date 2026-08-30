import { cssVar, Flex, theme } from "@webstudio-is/design-system";
import { Breadcrumbs } from "./breadcrumbs";

export const Footer = () => {
  return (
    <Flex
      as="footer"
      align="center"
      css={{
        isolation: "isolate",
        gridArea: "footer",
        height: theme.spacing[11],
        background: cssVar("--background-primary"),
        borderTop: `1px solid ${cssVar("--border-default")}`,
        color: cssVar("--foreground-primary"),
      }}
    >
      <Breadcrumbs />
    </Flex>
  );
};
