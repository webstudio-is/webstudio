import { useMemo } from "react";
import {
  useCanvasWidth,
  useSelectedBreakpoint,
} from "~/designer/shared/nano-states";
import { Slider, __DEPRECATED__Text, Flex } from "@webstudio-is/design-system";
import { useBreakpoints, useIsPreviewMode } from "~/shared/nano-states";
import { sort } from "@webstudio-is/project";

// Doesn't make sense to allow resizing the canvas lower/higher than this.
export const minWidth = 50;
export const maxWidth = 3000;

/**
 * Return the next breakpoint from the currently selected one, sorted by the `sort()`
 */
const useNextBreakpoint = () => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const [breakpoints] = useBreakpoints();

  const sortedBreakpoints = useMemo(() => sort(breakpoints), [breakpoints]);

  return useMemo(() => {
    if (selectedBreakpoint === undefined) return;
    const index = sortedBreakpoints.findIndex(
      (breakpoint) => breakpoint.id === selectedBreakpoint.id
    );
    if (index === -1) return undefined;
    return sortedBreakpoints[index + 1];
  }, [sortedBreakpoints, selectedBreakpoint]);
};

export const WidthSetting = () => {
  const [value, setValue] = useCanvasWidth();
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const nextBreakpoint = useNextBreakpoint();
  const [isPreviewMode] = useIsPreviewMode();

  if (selectedBreakpoint === undefined) return null;

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
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <__DEPRECATED__Text size="1">Canvas width</__DEPRECATED__Text>
      <Flex gap="3" align="center">
        <Slider
          min={min}
          max={max}
          value={[value]}
          onValueChange={([value]) => {
            setValue(value);
          }}
        />
        <__DEPRECATED__Text size="1">{`${value}px`}</__DEPRECATED__Text>
      </Flex>
    </Flex>
  );
};
