import { type Breakpoint } from "@webstudio-is/sdk";
import { Paragraph, Flex, Text } from "apps/designer/app/shared/design-system";

type PreviewProps = {
  breakpoint?: Breakpoint;
};

export const Preview = ({ breakpoint }: PreviewProps) => {
  return (
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <Text size="1">CSS Preview</Text>
      <Paragraph css={{ fontSize: "$1" }} variant="gray">
        {breakpoint === undefined
          ? "No breakpoint selected"
          : `@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Flex>
  );
};
