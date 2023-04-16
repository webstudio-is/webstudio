import { type ComponentProps } from "react";
import { useStore } from "@nanostores/react";
import {
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Flex,
  theme,
  toggleItemStyle,
} from "@webstudio-is/design-system";
import { scaleStore, useCanvasWidth } from "~/builder/shared/nano-states";
import { selectedBreakpointStore } from "~/shared/nano-states";

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

type TriggerButtonProps = ComponentProps<typeof DropdownMenuSubTrigger>;

export const TriggerButton = (props: TriggerButtonProps) => {
  const scale = useStore(scaleStore);
  const breakpoint = useStore(selectedBreakpointStore);
  const [canvasWidth] = useCanvasWidth();
  if (breakpoint === undefined || canvasWidth === undefined) {
    return null;
  }
  return (
    <DropdownMenuTrigger
      aria-label="Show breakpoints"
      className={toggleItemStyle({
        css: { gap: theme.spacing[5] },
      })}
    >
      <Value unit="PX" minWidth={55}>
        {Math.round(canvasWidth)}
      </Value>
      {scale !== 100 && (
        <Value unit="%" minWidth={30}>
          {Math.round(scale)}
        </Value>
      )}
    </DropdownMenuTrigger>
  );
};
