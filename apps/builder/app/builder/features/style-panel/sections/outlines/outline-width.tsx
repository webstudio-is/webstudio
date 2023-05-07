import type { StyleProperty } from "@webstudio-is/css-data";
import {
  Grid,
  theme,
  Box,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  DashBorderIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  SmallXIcon,
} from "@webstudio-is/icons";
import type { RenderCategoryProps } from "../../style-sections";
import { toPascalCase } from "../../shared/keyword-utils";
import { PropertyName } from "../../shared/property-name";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";

const outlineWidthProperties = [
  "outlineWidth",
] as const satisfies readonly StyleProperty[];

export const OutlineWidth = (
  props: Pick<
    RenderCategoryProps,
    "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
  >
) => {
  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
      }}
      gap={2}
    >
      <PropertyName
        property={outlineWidthProperties}
        style={props.currentStyle}
        label={"Width"}
        onReset={() => {
          console.log("called reset");
        }}
      />

      <Box>
        {/* <CssValueInputContainer
          label={"Outline"}
        /> */}
      </Box>
    </Grid>
  );
};
