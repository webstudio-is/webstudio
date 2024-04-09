import type { StyleProperty } from "@webstudio-is/css-engine";
import { Grid, theme, Box } from "@webstudio-is/design-system";
import {
  DashBorderIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  SmallXIcon,
} from "@webstudio-is/icons";
import type { SectionProps } from "../shared/section";
import { PropertyName } from "../../shared/property-name";
import { declarationDescriptions } from "@webstudio-is/css-data";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";

const property: StyleProperty = "outlineStyle";

const items = [
  {
    child: <SmallXIcon />,
    title: "None",
    description: declarationDescriptions["outlineStyle:none"],
    value: "none",
    propertyValues: "outline-style: none;",
  },
  {
    child: <DashBorderIcon />,
    title: "Solid",
    description: declarationDescriptions["outlineStyle:solid"],
    value: "solid",
    propertyValues: "outline-style: solid;",
  },
  {
    child: <DashedBorderIcon />,
    title: "Dashed",
    description: declarationDescriptions["outlineStyle:dashed"],
    value: "dashed",
    propertyValues: "outline-style: dashed;",
  },
  {
    child: <DottedBorderIcon />,
    title: "Dotted",
    description: declarationDescriptions["outlineStyle:dotted"],
    value: "dotted",
    propertyValues: "outline-style: dotted;",
  },
];

export const OutlineStyle = (
  props: Pick<SectionProps, "currentStyle" | "setProperty" | "deleteProperty">
) => {
  const { deleteProperty } = props;

  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
      }}
      gap={2}
    >
      <PropertyName
        properties={[property]}
        style={props.currentStyle}
        label={"Style"}
        onReset={() => deleteProperty(property)}
      />
      <Box css={{ gridColumn: `span 2`, justifySelf: "end" }}>
        <ToggleGroupControl {...props} items={items} property={property} />{" "}
      </Box>
    </Grid>
  );
};
