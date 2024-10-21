import type { StyleProperty } from "@webstudio-is/css-engine";
import { Box, Grid } from "@webstudio-is/design-system";
import {
  DashBorderIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  SmallXIcon,
} from "@webstudio-is/icons";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import {
  declarationDescriptions,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import { rowCss } from "./utils";
import { PropertyLabel } from "../../property-label";

export const properties: [StyleProperty, ...StyleProperty[]] = [
  "borderTopStyle",
  "borderRightStyle",
  "borderLeftStyle",
  "borderBottomStyle",
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
              child: <SmallXIcon />,
              description: declarationDescriptions["borderBlockStyle:none"],
              value: "none",
            },
            {
              child: <DashBorderIcon />,
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
