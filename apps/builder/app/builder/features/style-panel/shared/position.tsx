import type { PositionValue, UnitValue } from "@webstudio-is/css-data";
import { Flex, PositionGrid, theme } from "@webstudio-is/design-system";

const toPosition = (value: PositionValue | UnitValue) => {
  if (value.type === "position") {
    return {
      left: value.value.x.value,
      top: value.value.y.value,
    };
  }
  // In case of a unit value, its value will be used for both left and top
  return {
    left: value.value,
    top: value.value,
  };
};

type PositionProps = {
  value: PositionValue | UnitValue;
  onChange: (value: PositionValue) => void;
};

export const Position = ({ value, onChange }: PositionProps) => {
  return (
    <Flex css={{ px: theme.spacing[9], py: theme.spacing[5] }}>
      <PositionGrid
        selectedPosition={toPosition(value)}
        onSelect={({ left, top }) => {
          onChange({
            type: "position",
            value: {
              x: { type: "unit", value: left, unit: "%" },
              y: { type: "unit", value: top, unit: "%" },
            },
          });
        }}
      />
    </Flex>
  );
};
