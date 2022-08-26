import { type Breakpoint } from "@webstudio-is/react-sdk";
import {
  Paragraph,
  Flex,
  __DEPRECATED__Text,
} from "@webstudio-is/design-system";

type PreviewProps = {
  breakpoint?: Breakpoint;
};

export const Preview = ({ breakpoint }: PreviewProps) => {
  return (
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <__DEPRECATED__Text size="1">CSS Preview</__DEPRECATED__Text>
      <Paragraph css={{ fontSize: "$1" }} variant="gray">
        {breakpoint === undefined
          ? "No breakpoint selected"
          : `@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Flex>
  );
};
