import type { ComponentProps } from "react";
import { Flex, theme } from "@webstudio-is/design-system";

export const Header = ({
  variant,
  ...props
}: { variant: "aside" | "main" } & ComponentProps<typeof Flex>) => {
  return (
    <Flex
      as="header"
      align="center"
      justify="between"
      shrink={false}
      css={{
        paddingInline:
          variant === "aside" ? theme.spacing[5] : theme.spacing[13],
        height: theme.spacing[19],
        position: "sticky",
        top: 0,
        background: theme.colors.backgroundPanel,
        zIndex: 1,
      }}
      {...props}
    />
  );
};

export const Main = (props: ComponentProps<typeof Flex>) => {
  return (
    <Flex
      direction="column"
      as="main"
      grow
      css={{
        // Allows scrolling most parent container while header stays sticky
        overflow: "auto",
        // Keeps dialogs on top of the main content
        isolation: "isolate",
      }}
      {...props}
    />
  );
};
