import { Flex, ToggleGroup, Tooltip } from "@webstudio-is/design-system";

export type ToggleGroupControlProps = {
  value: string;
  items: { child: JSX.Element; label: string; value: string }[];
  onValueChange?: (value: string) => void;
};

export const ToggleGroupControl = ({
  value = "",
  items = [],
  onValueChange,
}: ToggleGroupControlProps) => (
  <ToggleGroup.Root
    type="single"
    value={value}
    onValueChange={onValueChange}
    css={{ width: "fit-content" }}
  >
    {items.map(({ child, label, value }, index) => {
      return (
        <ToggleGroup.Item key={index} value={value}>
          <Tooltip content={"label"} delayDuration={0}>
            <Flex>{child}</Flex>
          </Tooltip>
        </ToggleGroup.Item>
      );
    })}
  </ToggleGroup.Root>
);
