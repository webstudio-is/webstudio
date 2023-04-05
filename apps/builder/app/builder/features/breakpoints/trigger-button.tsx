import { type ComponentProps } from "react";
import { useStore } from "@nanostores/react";
import {
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  toggleItemStyle,
} from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import {
  selectedBreakpointStore,
  scaleStore,
} from "~/shared/nano-states/breakpoints";

type TriggerButtonProps = ComponentProps<typeof DropdownMenuSubTrigger>;

export const TriggerButton = (props: TriggerButtonProps) => {
  const scale = useStore(scaleStore);
  const breakpoint = useStore(selectedBreakpointStore);
  const [canvasWidth] = useCanvasWidth();
  if (breakpoint === undefined) {
    return null;
  }
  return (
    <DropdownMenuTrigger
      aria-label="Show breakpoints"
      className={toggleItemStyle()}
    >
      {`${canvasWidth}px ${scale}%`}
    </DropdownMenuTrigger>
  );
};
