import { type Breakpoint } from "@webstudio-is/react-sdk";
import { Paragraph, Flex, TextLegacy } from "@webstudio-is/design-system";

type PreviewProps = {
  breakpoint?: Breakpoint;
};

export const Preview = ({ breakpoint }: PreviewProps) => {
  return (
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <TextLegacy size="1">CSS Preview</TextLegacy>
      <Paragraph css={{ fontSize: "$1" }} variant="gray">
        {breakpoint === undefined
          ? "No breakpoint selected"
          : `@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Flex>
  );
};
