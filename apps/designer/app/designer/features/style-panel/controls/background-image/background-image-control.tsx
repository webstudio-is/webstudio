import { Grid, TextField } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { PropertyName } from "../../shared/property-name";
import { ValuePickerPopover } from "../../shared/value-picker-popover";
import { ImageManager } from "~/designer/shared/image-manager";
//import { useAssets } from "~/designer/shared/assets";

// @todo get rid of this custom styling, it should be part of the design system and/or reused across style panel
const textFieldStyle = {
  paddingLeft: "calc($sizes$1 + $nudge$3)",
  textAlign: "left",
  height: "$6",
  fontWeight: "500",
};

export const BackgroundImageControl = ({
  currentStyle,
  inheritedStyle,
  //setProperty,
  styleConfig,
}: ControlProps) => {
  //const { assets } = useAssets("image");
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  //const setValue = setProperty(styleConfig.property);

  //const selectedAsset = assets.find((asset) => asset.id === value.value);

  return (
    <Grid columns={2}>
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <ValuePickerPopover
        title="Images"
        content={
          <ImageManager
            onSelect={() => {
              //setValue(asset.id);
            }}
          />
        }
      >
        {/* @todo this should be part of the design system, probably a varian="button" */}
        <TextField
          css={textFieldStyle}
          spellCheck={false}
          readOnly
          //defaultValue={selectedAsset?.name}
        />
      </ValuePickerPopover>
    </Grid>
  );
};
