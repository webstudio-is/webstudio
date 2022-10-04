import { Grid, TextField } from "@webstudio-is/design-system";
import { FontsManager } from "~/designer/shared/fonts-manager";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { PropertyName } from "../../shared/property-name";
import { ValuePickerPopover } from "../../shared/value-picker-popover";

const textFieldStyle = {
  paddingLeft: "calc($sizes$1 + $nudge$3)",
  textAlign: "left",
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
      <ValuePickerPopover
        title="Fonts"
        content={
          <FontsManager value={String(value.value)} onChange={setValue} />
        }
      >
        <TextField
          css={textFieldStyle}
          spellCheck={false}
          readOnly
          defaultValue={value.value}
        />
      </ValuePickerPopover>
    </Grid>
  );
};
