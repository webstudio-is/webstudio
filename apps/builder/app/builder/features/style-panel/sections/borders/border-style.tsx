import type { CssProperty } from "@webstudio-is/css-engine";
import { Box, Grid } from "@webstudio-is/design-system";
import {
  MinusIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  XSmallIcon,
} from "@webstudio-is/icons";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import {
  declarationDescriptions,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import { rowCss } from "./utils";
import { PropertyLabel } from "../../property-label";

export const properties: [CssProperty, ...CssProperty[]] = [
  "border-top-style",
  "border-right-style",
  "border-left-style",
  "border-bottom-style",
];

export const BorderStyle = () => {
  return (
    <Grid css={rowCss}>
      <PropertyLabel
        label="Style"
        description={propertyDescriptions.borderBlockStyle}
        properties={properties}
      />
      <Box css={{ gridColumn: `span 2` }}>
        <ToggleGroupControl
          label="Style"
          properties={properties}
          items={[
            {
              child: <XSmallIcon />,
              description: declarationDescriptions["borderBlockStyle:none"],
              value: "none",
            },
            {
              child: <MinusIcon />,
              description: declarationDescriptions["borderBlockStyle:solid"],
              value: "solid",
            },
            {
              child: <DashedBorderIcon />,
              description: declarationDescriptions["borderBlockStyle:dashed"],
              value: "dashed",
            },
            {
              child: <DottedBorderIcon />,
              description: declarationDescriptions["borderBlockStyle:dotted"],
              value: "dotted",
            },
          ]}
        />
      </Box>
    </Grid>
  );
};
