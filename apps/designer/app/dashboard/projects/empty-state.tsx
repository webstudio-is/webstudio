import { css, Flex, Text, theme } from "@webstudio-is/design-system";
import { type ComponentProps } from "react";

const containerStyle = css({
  background: "linear-gradient(180deg, #E63CFE 0%, #FFAE3C 100%)",
  color: theme.colors.foregroundContrastMain,
  borderRadius: theme.borderRadius[4],
  height: theme.spacing[29],
  minWidth: 600,
});

const EmptyStateContainer = (props: ComponentProps<typeof Flex>) => (
  <Flex
    align="center"
    justify="center"
    direction="column"
    gap="2"
    className={containerStyle()}
    {...props}
  />
);

export const EmptyState = () => (
  <EmptyStateContainer>
    <Text variant="brandLargeTitle" as="h1">
      What will you create?
    </Text>
    <Text variant="brandRegular">Start your first project today!</Text>
  </EmptyStateContainer>
);
