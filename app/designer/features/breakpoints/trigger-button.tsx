import { forwardRef, type ComponentProps, type ElementRef } from "react";
import { type Breakpoint } from "@webstudio-is/sdk";
import { useScale } from "~/designer/shared/nano-values";
import { Button, Text } from "~/shared/design-system";

const buildStatus = (breakpoint: Breakpoint, scale: number) => {
  const status = [];
  if (breakpoint.minWidth > 0) status.push(`${breakpoint.minWidth}px`);
  if (scale < 100) {
    if (status.length !== 0) status.push("/");
    status.push(`${scale}%`);
  }
  return status.join(" ");
};

type TriggerButtonProps = {
  breakpoint: Breakpoint;
} & ComponentProps<typeof Button>;

export const TriggerButton = forwardRef<
  ElementRef<typeof Button>,
  TriggerButtonProps
>(({ breakpoint, ...props }, ref) => {
  const [scale] = useScale();
  const status = buildStatus(breakpoint, scale);
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
