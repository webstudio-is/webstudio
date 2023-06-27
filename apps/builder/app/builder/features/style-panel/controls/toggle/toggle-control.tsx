import {
  Flex,
  ToggleGroup,
  ToggleGroupButton,
  EnhancedTooltip,
} from "@webstudio-is/design-system";
import type { StyleSource } from "../../shared/style-info";

export type ToggleGroupControlProps = {
  styleSource?: StyleSource;
  value: string;
  items: { child: JSX.Element; label: string; value: string }[];
  onValueChange?: (value: string) => void;
  onReset: () => void;
};

// @todo refactor this control to follow the standard interface we otherwise have for all controls
export const ToggleGroupControl = ({
  styleSource,
  value = "",
  items = [],
  onValueChange,
  onReset,
}: ToggleGroupControlProps) => {
  return (
    <ToggleGroup
      color={styleSource}
      type="single"
      value={value}
      onValueChange={onValueChange}
      css={{ width: "fit-content" }}
    >
      {items.map(({ child, label, value }, index) => {
        return (
          <EnhancedTooltip key={index} content={label}>
            <ToggleGroupButton
              value={value}
              onClick={(event) => {
                if (event.altKey) {
                  onReset?.();
                }
              }}
            >
              <Flex>{child}</Flex>
            </ToggleGroupButton>
          </EnhancedTooltip>
        );
      })}
    </ToggleGroup>
  );
};
