import { forwardRef, type ComponentProps, type ElementRef } from "react";
import { useStore } from "@nanostores/react";
import { Button, Text } from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import {
  selectedBreakpointStore,
  zoomStore,
} from "~/shared/nano-states/breakpoints";
import { matchMedia } from "@webstudio-is/css-engine";

type TriggerButtonProps = ComponentProps<typeof Button>;

export const TriggerButton = forwardRef<
  ElementRef<typeof Button>,
  TriggerButtonProps
>((props, ref) => {
  const zoom = useStore(zoomStore);
  const breakpoint = useStore(selectedBreakpointStore);
  const [canvasWidth] = useCanvasWidth();
  if (breakpoint === undefined) {
    return null;
  }
  const variant = matchMedia(breakpoint, canvasWidth) ? "contrast" : "subtle";

  return (
    <Button {...props} ref={ref} color="dark" aria-label="Show breakpoints">
      <Text color={variant}>
        {`${breakpoint.label} ${canvasWidth}px / ${zoom}%`}
      </Text>
    </Button>
  );
});

TriggerButton.displayName = "TriggerButton";
