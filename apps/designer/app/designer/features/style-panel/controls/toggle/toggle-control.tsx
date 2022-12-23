import {
  styled,
  Flex,
  Tooltip,
  ToggleGroup,
  ToggleGroupItem,
} from "@webstudio-is/design-system";
import type { StyleProperty } from "@webstudio-is/css-data";
import { useIsFromCurrentBreakpoint } from "../../shared/use-is-from-current-breakpoint";

export type ToggleGroupControlProps = {
  property: StyleProperty | StyleProperty[];
  value: string;
  items: { child: JSX.Element; label: string; value: string }[];
  onValueChange?: (value: string) => void;
};

export const ToggleGroupControl = ({
  property,
  value = "",
  items = [],
  onValueChange,
}: ToggleGroupControlProps) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onValueChange}
      css={{ width: "fit-content" }}
    >
      {items.map(({ child, label, value }, index) => {
        return (
          <ToggleGroupControlItem
            key={index}
            value={value}
            state={isCurrentBreakpoint ? "set" : undefined}
          >
            <Tooltip content={label} delayDuration={0}>
              <Flex>{child}</Flex>
            </Tooltip>
          </ToggleGroupControlItem>
        );
      })}
    </ToggleGroup>
  );
};

const ToggleGroupControlItem = styled(ToggleGroupItem, {
  variants: {
    state: {
      set: {
        "&[data-state=on]": {
          color: "$colors$blue11",
          backgroundColor: "$colors$blue4",
        },
      },
      inherited: {
        "&[data-state=on]": {
          color: "$colors$orange4",
          backgroundColor: "$colors$orange4",
        },
      },
    },
  },
});
