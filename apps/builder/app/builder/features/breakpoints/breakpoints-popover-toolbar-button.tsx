import { forwardRef, type ComponentProps } from "react";
import { useStore } from "@nanostores/react";
import { Flex, theme } from "@webstudio-is/design-system";
import { $scale, useCanvasWidth } from "~/builder/shared/nano-states";
import { $selectedBreakpoint } from "~/shared/nano-states";

const Value = ({
  children,
  unit,
  minWidth,
}: {
  children?: number;
  unit: string;
  minWidth: number;
}) => {
  return (
    <Flex gap="1" as="span" justify="end" css={{ minWidth }}>
      {children}
      <Flex css={{ color: theme.colors.foregroundTextMoreSubtle }} as="span">
        {unit}
      </Flex>
    </Flex>
  );
};

export const BreakpointsPopoverToolbarButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button">
>((props, ref) => {
  const scale = useStore($scale);
  const breakpoint = useStore($selectedBreakpoint);
  const [canvasWidth] = useCanvasWidth();
  if (breakpoint === undefined || canvasWidth === undefined) {
    return null;
  }
  const roundedScale = Math.round(scale);
  return (
    <button ref={ref} {...props}>
      <Value unit="PX" minWidth={55}>
        {Math.round(canvasWidth)}
      </Value>
      {roundedScale !== 100 && (
        <Value unit="%" minWidth={30}>
          {roundedScale}
        </Value>
      )}
    </button>
  );
});

BreakpointsPopoverToolbarButton.displayName = "BreakpointsPopoverToolbarButton";
