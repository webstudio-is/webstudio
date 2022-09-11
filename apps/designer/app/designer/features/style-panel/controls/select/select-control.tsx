import { Grid, Select } from "@webstudio-is/design-system";
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
    <Grid css={{ gridTemplateColumns: "$columns$1" }}>
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <Select
        options={styleConfig.items.map(({ label }) => label)}
        value={String(value.value)}
        onChange={setValue}
        ghost
        css={{
          gap: "calc($sizes$1 / 2)",
          paddingLeft: "calc($sizes$4 / 2)",
          height: "calc($sizes$5 + $sizes$1)",
          boxShadow: "inset 0 0 0 1px $colors$slate7",
          textTransform: "capitalize",
          fontWeight: "inherit",
          "&:hover": { background: "none" },
        }}
      />
    </Grid>
  );
};
