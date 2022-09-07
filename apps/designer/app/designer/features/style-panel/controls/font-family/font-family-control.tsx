import {
  Grid,
  TextField,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
} from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { PropertyName } from "../../shared/property-name";
import { PANEL_WIDTH } from "~/designer/shared/constants";

const textFieldStyle = {
  height: "$6",
  fontWeight: "500",
};

export const FontFamilyControl = ({
  currentStyle,
  inheritedStyle,
  //setProperty,
  styleConfig,
}: ControlProps) => {
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  //const setValue = setProperty(styleConfig.property);

  return (
    <Grid columns={2}>
      <PropertyName property={styleConfig.property} label={styleConfig.label} />

      <Popover>
        <PopoverTrigger asChild aria-label="Share project">
          <TextField
            css={textFieldStyle}
            spellCheck={false}
            readOnly
            defaultValue={value.value}
            onClick={() => {
              // @todo show font picker
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                // @todo show font picker
              }
            }}
          />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            //alignOffset={PANEL_WIDTH}
            sideOffset={PANEL_WIDTH}
            side="right"
            hideArrow
          >
            <PopoverHeader title="Assets" />
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </Grid>
  );
};
