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
            source={styleSource}
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
    source: {
      default: {},
      preset: {},
      local: {
        "&[data-state=on]": {
          color: theme.colors.foregroundLocalMain,
          backgroundColor: theme.colors.backgroundLocalMain,
        },
      },
      overwritten: {
        "&[data-state=on]": {
          color: theme.colors.foregroundOverwrittenMain,
          backgroundColor: theme.colors.backgroundOverwrittenMain,
        },
      },
      remote: {
        "&[data-state=on]": {
          color: theme.colors.foregroundRemoteMain,
          backgroundColor: theme.colors.backgroundRemoteMain,
        },
      },
    },
  },
});
