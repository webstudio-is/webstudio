import { type Breakpoint } from "@webstudio-is/css-data";
import { Paragraph, Flex, Text } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

type PreviewProps = {
  breakpoint?: Breakpoint;
};

export const Preview = ({ breakpoint }: PreviewProps) => {
  return (
    <Flex
      css={{ px: theme.spacing[11], py: theme.spacing[3] }}
      gap="1"
      direction="column"
    >
      <Text>CSS Preview</Text>
      <Paragraph color="hint">
        {breakpoint === undefined
          ? "No breakpoint selected"
          : `@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Flex>
  );
};
