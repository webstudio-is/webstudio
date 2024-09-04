import { Grid, theme, Box } from "@webstudio-is/design-system";
import {
  DashBorderIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  SmallXIcon,
} from "@webstudio-is/icons";
import { propertyDescriptions } from "@webstudio-is/css-data";
import { PropertyLabel } from "../../property-label";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";

export const OutlineStyle = () => {
  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
      }}
      gap={2}
    >
      <PropertyLabel
        label="Style"
        description={propertyDescriptions.outlineStyle}
        properties={["outlineStyle"]}
      />
      <Box css={{ gridColumn: `span 2`, justifySelf: "end" }}>
        <ToggleGroupControl
          label="Style"
          properties={["outlineStyle"]}
          items={[
            { child: <SmallXIcon />, value: "none" },
            { child: <DashBorderIcon />, value: "solid" },
            { child: <DashedBorderIcon />, value: "dashed" },
            { child: <DottedBorderIcon />, value: "dotted" },
          ]}
        />
      </Box>
    </Grid>
  );
};
