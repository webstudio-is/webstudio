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
      css={{
        paddingInline:
          variant === "aside" ? theme.spacing[5] : theme.spacing[13],
        height: theme.spacing[19],
      }}
      {...props}
    />
  );
};
