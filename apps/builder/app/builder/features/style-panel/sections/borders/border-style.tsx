import type { StyleProperty } from "@webstudio-is/css-engine";
import { Box, Grid } from "@webstudio-is/design-system";
import {
  DashBorderIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  SmallXIcon,
} from "@webstudio-is/icons";
import { PropertyName } from "../../shared/property-name";
import type { SectionProps } from "../shared/section";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import {
  declarationDescriptions,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  deleteAllProperties,
  setAllProperties,
  rowCss,
  isAdvancedValue,
} from "./utils";

export const properties: StyleProperty[] = [
  "borderTopStyle",
  "borderRightStyle",
  "borderLeftStyle",
  "borderBottomStyle",
] satisfies Array<StyleProperty>;

const items = [
  {
    child: <SmallXIcon />,
    title: "None",
    description: declarationDescriptions["borderBlockStyle:none"],
    value: "none",
    propertyValues: "border-style: none;",
  },
  {
    child: <DashBorderIcon />,
    title: "Solid",
    description: declarationDescriptions["borderBlockStyle:solid"],
    value: "solid",
    propertyValues: "border-style: solid;",
  },
  {
    child: <DashedBorderIcon />,
    title: "Dashed",
    description: declarationDescriptions["borderBlockStyle:dashed"],
    value: "dashed",
    propertyValues: "border-style: dashed;",
  },
  {
    child: <DottedBorderIcon />,
    title: "Dotted",
    description: declarationDescriptions["borderBlockStyle:dotted"],
    value: "dotted",
    propertyValues: "border-style: dotted;",
  },
];

export const BorderStyle = (
  props: Pick<
    SectionProps,
    "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
  >
) => {
  // We do not use shorthand properties such as borderWidth or borderRadius in our code.
  // However, in the UI, we can display a single field, and in that case, we can use any property
  // from the shorthand property set and pass it instead.
  const firstPropertyName = properties[0];

  const deleteBorderProperties = deleteAllProperties(
    properties,
    props.createBatchUpdate
  );

  const setBorderProperties = setAllProperties(
    properties,
    props.createBatchUpdate
  )(firstPropertyName);

  const handleDelete = () => deleteBorderProperties(firstPropertyName);

  return (
    <Grid css={rowCss}>
      <PropertyName
        style={props.currentStyle}
        properties={properties}
        label="Style"
        description={propertyDescriptions.borderBlockStyle}
        onReset={handleDelete}
      />
      <Box css={{ gridColumn: `span 2`, justifySelf: "end" }}>
        <ToggleGroupControl
          {...props}
          items={items}
          property={firstPropertyName}
          deleteProperty={handleDelete}
          setProperty={() => setBorderProperties}
          isAdvanced={isAdvancedValue(properties, props.currentStyle)}
        />
      </Box>
    </Grid>
  );
};
