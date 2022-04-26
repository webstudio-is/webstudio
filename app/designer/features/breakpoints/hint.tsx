import { type Breakpoint } from "@webstudio-is/sdk";
import { Paragraph, Flex, Text } from "~/shared/design-system";

type HintProps = {
  breakpoint?: Breakpoint;
};

export const Hint = ({ breakpoint }: HintProps) => {
  return (
    <Flex css={{ px: "$5" }} gap="1" direction="column">
      <Text size="1">CSS Preview:</Text>
      <Paragraph css={{ fontSize: "$1" }} variant="gray">
        {breakpoint === undefined
          ? "No breakpoint selected"
          : `@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Flex>
  );
};
