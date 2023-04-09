import { useStore } from "@nanostores/react";
import { findApplicableMedia } from "@webstudio-is/css-engine";
import { theme, Text, Flex, Slider } from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { breakpointsStore } from "~/shared/nano-states";
import {
  selectedBreakpointIdStore,
  selectedBreakpointStore,
} from "~/shared/nano-states";

// Doesn't make sense to allow resizing the canvas lower/higher than this.
export const minWidth = 240;
export const maxWidth = 2500;

export const WidthSetting = () => {
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const breakpoints = useStore(breakpointsStore);

  if (canvasWidth === undefined || selectedBreakpoint === undefined) {
    return null;
  }

  return (
    <Flex
      css={{ px: theme.spacing[11], py: theme.spacing[3] }}
      gap="1"
      direction="column"
    >
      <Text>Canvas width</Text>
      <Flex gap="3" align="center">
        <Slider
          min={minWidth}
          max={maxWidth}
          value={[canvasWidth]}
          onValueChange={([value]) => {
            setCanvasWidth(value);
            const applicableBreakpoint = findApplicableMedia(
              Array.from(breakpoints.values()),
              value
            );
            if (applicableBreakpoint) {
              selectedBreakpointIdStore.set(applicableBreakpoint.id);
            }
          }}
        />
        <Text>{`${canvasWidth}px`}</Text>
      </Flex>
    </Flex>
  );
};
