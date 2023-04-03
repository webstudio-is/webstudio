import type { Breakpoint } from "@webstudio-is/project-build";
import {
  theme,
  DeprecatedParagraph,
  Flex,
  DeprecatedText2,
} from "@webstudio-is/design-system";

type PreviewProps = {
  breakpoint?: Breakpoint;
};

export const Preview = ({ breakpoint }: PreviewProps) => {
  return (
    <Flex
      css={{
        px: theme.spacing[11],
        py: theme.spacing[3],

        // need a constant width to avoid entire menu width change
        // as user hovers over different breakpoints
        width: theme.spacing[29],
      }}
      gap="1"
      direction="column"
    >
      <DeprecatedText2>CSS Preview</DeprecatedText2>
      <DeprecatedParagraph color="hint">
        {breakpoint === undefined
          ? "No breakpoint selected"
          : "minWidth" in breakpoint
          ? `@media (min-width: ${breakpoint.minWidth}px)`
          : "maxWidth" in breakpoint
          ? `@media (max-width: ${breakpoint.maxWidth}px)`
          : "@media all"}
      </DeprecatedParagraph>
    </Flex>
  );
};
