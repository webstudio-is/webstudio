import { forwardRef, type ComponentProps, type ElementRef } from "react";
import {
  useCanvasWidth,
  useScale,
  useSelectedBreakpoint,
} from "~/designer/shared/nano-values";
import { Button, Text } from "~/shared/design-system";

const buildStatus = (scale: number, canvasWidth?: number) => {
  const status = [];
  if (canvasWidth !== undefined && canvasWidth > 0) {
    status.push(`${canvasWidth}px`);
  }
  if (status.length !== 0) status.push("/");
  status.push(`${scale}%`);
  return status.join(" ");
};

type TriggerButtonProps = ComponentProps<typeof Button>;

export const TriggerButton = forwardRef<
  ElementRef<typeof Button>,
  TriggerButtonProps
>((props, ref) => {
  const [scale] = useScale();
  const [breakpoint] = useSelectedBreakpoint();
  const [canvasWidth] = useCanvasWidth();
  if (breakpoint === undefined) return null;
  const status = buildStatus(scale, canvasWidth);
  return (
    <Button
      {...props}
      ref={ref}
      css={{ gap: "$1" }}
      ghost
      aria-label="Show breakpoints"
    >
      <Text size="1">{breakpoint.label}</Text>

      {status.length !== 0 && (
        <Text size="1" variant="gray">
          {status}
        </Text>
      )}
    </Button>
  );
});

TriggerButton.displayName = "TriggerButton";
