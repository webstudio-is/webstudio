import { type ComponentProps } from "react";
import { useStore } from "@nanostores/react";
import {
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Flex,
  theme,
  toggleItemStyle,
} from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import {
  selectedBreakpointStore,
  scaleStore,
} from "~/shared/nano-states/breakpoints";

const Value = ({ children, unit }: { children?: number; unit: string }) => {
  return (
    <Flex gap="1" as="span">
      {children}
      <Flex css={{ color: theme.colors.foregroundTextMoreSubtle }} as="span">
        {unit}
      </Flex>
    </Flex>
  );
};

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
      className={toggleItemStyle({
        css: {
          gap: theme.spacing[5],
        },
      })}
    >
      <Value unit="PX">{canvasWidth}</Value>
      {scale !== 100 && <Value unit="%">{scale}</Value>}
    </DropdownMenuTrigger>
  );
};
