import { Flex, ToggleGroup, Tooltip } from "@webstudio-is/design-system";
import { StyleProperty } from "@webstudio-is/react-sdk";
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
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={onValueChange}
      css={{ width: "fit-content" }}
    >
      {items.map(({ child, label, value }, index) => {
        return (
          <ToggleGroup.Item
            key={index}
            value={value}
            data-breakpoint={isCurrentBreakpoint}
          >
            <Tooltip content={label} delayDuration={0}>
              <Flex>{child}</Flex>
            </Tooltip>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
};
