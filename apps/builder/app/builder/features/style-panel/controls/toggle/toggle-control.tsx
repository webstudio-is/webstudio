import {
  styled,
  Flex,
  Tooltip,
  ToggleGroup,
  ToggleGroupItem,
} from "@webstudio-is/design-system";
import type { StyleSource } from "../../shared/style-info";
import { theme } from "@webstudio-is/design-system";

export type ToggleGroupControlProps = {
  styleSource: StyleSource;
  value: string;
  items: { child: JSX.Element; label: string; value: string }[];
  onValueChange?: (value: string) => void;
};

// @todo refactor this control to follow the standard interface we otherwise have for all controls
export const ToggleGroupControl = ({
  styleSource,
  value = "",
  items = [],
  onValueChange,
}: ToggleGroupControlProps) => {
  let state: undefined | "set" | "inherited" = undefined;
  if (styleSource === "local") {
    state = "set";
  }
  if (styleSource === "remote") {
    state = "inherited";
  }
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onValueChange}
      css={{ width: "fit-content" }}
    >
      {items.map(({ child, label, value }, index) => {
        return (
          <ToggleGroupControlItem key={index} value={value} state={state}>
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
          color: theme.colors.blue11,
          backgroundColor: theme.colors.blue4,
        },
      },
      inherited: {
        "&[data-state=on]": {
          color: theme.colors.orange11,
          backgroundColor: theme.colors.orange4,
        },
      },
    },
  },
});
