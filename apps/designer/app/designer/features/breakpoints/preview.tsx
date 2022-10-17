import { type Breakpoint } from "@webstudio-is/react-sdk";
import { Paragraph, Flex, Text } from "@webstudio-is/design-system";

type PreviewProps = {
  breakpoint?: Breakpoint;
};

export const Preview = ({ breakpoint }: PreviewProps) => {
  return (
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <Text>CSS Preview</Text>
      <Paragraph color="hint">
        {breakpoint === undefined
          ? "No breakpoint selected"
          : `@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Flex>
  );
};
