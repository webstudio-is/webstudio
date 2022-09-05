import { cssVars } from "@webstudio-is/css-vars";
import { Grid, Select } from "@webstudio-is/design-system";
import { getFinalValue } from "../../shared/get-final-value";
import { PropertyName } from "../../shared/property-name";
import type { ControlProps } from "../../style-sections";

const gridTemplateColumnsVar = cssVars.define("grid-template-columns");

export const selectControlCssVars = ({
  gridTemplateColumns,
}: {
  gridTemplateColumns: string;
}) => ({
  [gridTemplateColumnsVar]: gridTemplateColumns,
});

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
    <Grid
      columns={2}
      css={{
        gridTemplateColumns: cssVars.use(
          gridTemplateColumnsVar,
          "repeat(2, 1fr)"
        ),
      }}
    >
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <Select
        options={styleConfig.items.map(({ label }) => label)}
        value={String(value.value)}
        onChange={setValue}
        ghost
        css={{
          gap: "calc($sizes$1 / 2)",
          px: "calc($sizes$1 + $nudge$3)",
          height: "$sizes$6",
          boxShadow: "inset 0 0 0 1px $colors$slate7",
          textTransform: "capitalize",
          fontWeight: "inherit",
          "&:hover": { background: "none" },
        }}
      />
    </Grid>
  );
};
