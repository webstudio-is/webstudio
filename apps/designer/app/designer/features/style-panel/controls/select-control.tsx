import { Flex, Select } from "@webstudio-is/design-system";
import { getFinalValue } from "../shared/get-final-value";
import { PropertyName } from "./property-name";
import type { ControlProps } from "../style-sections";

const SelectControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  return (
    <Flex align="center">
      <PropertyName
        property={styleConfig.property}
        label={styleConfig.label}
        css={{
          fontWeight: "500",
          marginRight: "$sizes$1",
        }}
      />
      <Select
        options={styleConfig.items.map(({ label }) => label)}
        value={String(value.value)}
        onChange={setValue}
        ghost
        css={{
          gap: "calc($sizes$1 / 2)",
          px: "$sizes$1",
          fontWeight: "500",
          textTransform: "capitalize",
          "&:hover": { background: "none" },
        }}
      />
    </Flex>
  );
};

export { SelectControl };
