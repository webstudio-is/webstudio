import { Grid, TextField } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { PropertyName } from "../../shared/property-name";

const textFieldStyle = {
  height: "$6",
  fontWeight: "500",
};

export const FontFamilyControl = ({
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
    <Grid columns={2}>
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <TextField
        css={textFieldStyle}
        spellCheck={false}
        readOnly
        defaultValue={value.value}
        onClick={() => {
          console.log("show font picker");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            console.log("show font picker");
          }
        }}
      />
    </Grid>
  );
};
