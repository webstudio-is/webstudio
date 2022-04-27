import { forwardRef, type ComponentProps, type ElementRef } from "react";
import {
  useCanvasWidth,
  useScale,
  useSelectedBreakpoint,
} from "~/designer/shared/nano-values";
import { Button, Text } from "~/shared/design-system";

type TriggerButtonProps = ComponentProps<typeof Button>;

export const TriggerButton = forwardRef<
  ElementRef<typeof Button>,
  TriggerButtonProps
>((props, ref) => {
  const [scale] = useScale();
  const [breakpoint] = useSelectedBreakpoint();
  const [canvasWidth = 0] = useCanvasWidth();
  if (breakpoint === undefined) return null;
  return (
    <Button
      {...props}
      ref={ref}
      css={{ gap: "$1" }}
      ghost
      aria-label="Show breakpoints"
    >
      <Text
        size="1"
        variant={canvasWidth > breakpoint.minWidth ? "contrast" : "gray"}
      >
        {`${breakpoint.label} ${canvasWidth}px / ${scale}%`}
      </Text>
    </Button>
  );
});

TriggerButton.displayName = "TriggerButton";
