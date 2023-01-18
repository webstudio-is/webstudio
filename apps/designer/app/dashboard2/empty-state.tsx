import { Flex, Text, styled, theme } from "@webstudio-is/design-system";

const EmptyStateContainer = styled(Flex, {
  background: "linear-gradient(180deg, #E63CFE 0%, #FFAE3C 100%)",
  borderRadius: theme.borderRadius[4],
  height: theme.spacing[29],
});

const Heading = styled("h1", {
  color: theme.colors.foregroundContrastMain,
  lineHeight: 1,
  margin: 0,
  variants: {
    // @todo align names with figma
    variant: {
      large: {
        // @todo use theme and ask Mark to add it to tokens
        fontSize: 48,
      },
      small: {
        fontSize: theme.fontSize[5],
      },
    },
  },
});

export const EmptyState = () => (
  <EmptyStateContainer
    align="center"
    justify="center"
    direction="column"
    gap="3"
  >
    <Heading variant="large">What will you create?</Heading>
    <Heading variant="small" as="h2">
      Start your first project today!
    </Heading>
  </EmptyStateContainer>
);
