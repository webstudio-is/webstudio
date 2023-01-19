import { Flex, styled, theme } from "@webstudio-is/design-system";
import { Heading } from "./heading";

const EmptyStateContainer = styled(Flex, {
  background: "linear-gradient(180deg, #E63CFE 0%, #FFAE3C 100%)",
  color: theme.colors.foregroundContrastMain,
  borderRadius: theme.borderRadius[4],
  height: theme.spacing[29],
});

export const EmptyState = () => (
  <EmptyStateContainer
    align="center"
    justify="center"
    direction="column"
    gap="3"
  >
    <Heading variant="large">What will you create?</Heading>
    <Heading variant="tiny" as="h3">
      Start your first project today!
    </Heading>
  </EmptyStateContainer>
);
