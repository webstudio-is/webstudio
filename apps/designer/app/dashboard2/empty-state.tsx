import { css, Flex, theme } from "@webstudio-is/design-system";
import { type ComponentProps } from "react";
import { Heading } from "./heading";

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
    gap="3"
    className={containerStyle()}
    {...props}
  />
);

export const EmptyState = () => (
  <EmptyStateContainer>
    <Heading variant="large">What will you create?</Heading>
    <Heading variant="tiny">Start your first project today!</Heading>
  </EmptyStateContainer>
);
