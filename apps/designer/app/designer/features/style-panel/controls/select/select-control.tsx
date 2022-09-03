import { Flex, Select } from "@webstudio-is/design-system";
import { getFinalValue } from "../../shared/get-final-value";
import { PropertyName } from "../../shared/property-name";
import type { ControlProps } from "../../style-sections";

export const SelectControl = ({
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
    <Flex align="center" css={{ gap: "var(--space-gap)" }}>
      <PropertyName
        property={styleConfig.property}
        label={styleConfig.label}
        css={{
          flexBasis: "var(--label-inline, 50%)",
        }}
      />
      <Select
        options={styleConfig.items.map(({ label }) => label)}
        value={String(value.value)}
        onChange={setValue}
        ghost
        css={{
          flexGrow: "var(--select-inline, 1)",
          gap: "calc($sizes$1 / 2)",
          px: "calc($sizes$1 + $nudge$3)",
          height: "$sizes$6",
          boxShadow: "inset 0 0 0 1px $colors$slate7",
          textTransform: "capitalize",
          fontWeight: "var(--label-weight)",
          "&:hover": { background: "none" },
        }}
      />
    </Flex>
  );
};
