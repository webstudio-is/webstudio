import { useStore } from "@nanostores/react";
import {
  theme,
  DeprecatedText2,
  Flex,
  Slider,
} from "@webstudio-is/design-system";
import { useIsPreviewMode } from "~/shared/nano-states";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { useNextBreakpoint } from "./use-next-breakpoint";

// Doesn't make sense to allow resizing the canvas lower/higher than this.
export const minWidth = 360;
export const maxWidth = 3000;

export const WidthSetting = () => {
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const nextBreakpoint = useNextBreakpoint();
  const [isPreviewMode] = useIsPreviewMode();

  if (selectedBreakpoint === undefined) {
    return null;
  }

  // We want to enable unconstrained resizing in a preview mode
  const min = isPreviewMode
    ? minWidth
    : Math.max(minWidth, selectedBreakpoint.minWidth);
  const max = isPreviewMode
    ? maxWidth
    : Math.min(
        maxWidth,
        nextBreakpoint ? nextBreakpoint.minWidth - 1 : maxWidth
      );

  return (
    <Flex
      css={{ px: theme.spacing[11], py: theme.spacing[3] }}
      gap="1"
      direction="column"
    >
      <DeprecatedText2>Canvas width</DeprecatedText2>
      <Flex gap="3" align="center">
        <Slider
          min={min}
          max={max}
          value={[canvasWidth]}
          onValueChange={([value]) => {
            setCanvasWidth(value);
          }}
        />
        <DeprecatedText2>{`${canvasWidth}px`}</DeprecatedText2>
      </Flex>
    </Flex>
  );
};
