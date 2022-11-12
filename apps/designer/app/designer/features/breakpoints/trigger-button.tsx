import { forwardRef, type ComponentProps, type ElementRef } from "react";
import { type Breakpoint } from "@webstudio-is/react-sdk";
import {
  useCanvasWidth,
  useZoom,
  useSelectedBreakpoint,
} from "~/designer/shared/nano-states";
import { willRender } from "~/designer/shared/breakpoints";
import { Button, Text } from "@webstudio-is/design-system";
import {
  DesktopIcon,
  LaptopIcon,
  MobileIcon,
  TabletIcon,
} from "@webstudio-is/icons";

type TriggerButtonProps = ComponentProps<typeof Button>;

const renderIcon = (breakpoint: Breakpoint, variant: "contrast" | "hint") => {
  const color = variant === "contrast" ? "white" : "hint";
  if (breakpoint.minWidth >= 1280) {
    return <DesktopIcon color={color} />;
  }
  if (breakpoint.minWidth >= 1024) {
    return <LaptopIcon color={color} />;
  }
  if (breakpoint.minWidth >= 768) {
    return <TabletIcon color={color} />;
  }
  return <MobileIcon color={color} />;
};

export const TriggerButton = forwardRef<
  ElementRef<typeof Button>,
  TriggerButtonProps
>((props, ref) => {
  const [zoom] = useZoom();
  const [breakpoint] = useSelectedBreakpoint();
  const [canvasWidth] = useCanvasWidth();
  if (breakpoint === undefined) return null;
  const variant = willRender(breakpoint, canvasWidth) ? "contrast" : "hint";

  return (
    <Button
      {...props}
      ref={ref}
      css={{ gap: "$spacing$3" }}
      ghost
      aria-label="Show breakpoints"
    >
      {renderIcon(breakpoint, variant)}
      <Text color={variant}>
        {`${breakpoint.label} ${canvasWidth}px / ${zoom}%`}
      </Text>
    </Button>
  );
});

TriggerButton.displayName = "TriggerButton";
