import type { StyleProperty } from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import { Grid, theme } from "@webstudio-is/design-system";
import {
  DashBorderIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  SmallXIcon,
} from "@webstudio-is/icons";
import { PropertyName } from "../../shared/property-name";
import type { SectionProps } from "../shared/section-component";
import { deleteAllProperties, setAllProperties } from "./border-utils";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";
import { getStyleSource } from "../../shared/style-info";
import { declarationDescriptions } from "@webstudio-is/css-data";

const borderStyleProperties: StyleProperty[] = [
  "borderTopStyle",
  "borderRightStyle",
  "borderLeftStyle",
  "borderBottomStyle",
];

export const BorderStyle = (
  props: Pick<
    SectionProps,
    "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
  >
) => {
  /**
   * We do not use shorthand properties such as borderWidth or borderRadius in our code.
   * However, in the UI, we can display a single field, and in that case, we can use any property
   * from the shorthand property set and pass it instead.
   **/
  const firstPropertyName = borderStyleProperties[0];

  const deleteBorderProperties = deleteAllProperties(
    borderStyleProperties,
    props.createBatchUpdate
  );

  const setBorderProperties = setAllProperties(
    borderStyleProperties,
    props.createBatchUpdate
  )(firstPropertyName);

  const firstPropertyValue = toValue(
    props.currentStyle[firstPropertyName]?.value ?? {
      type: "keyword",
      value: "none",
    }
  );
  const onReset = () => deleteBorderProperties(firstPropertyName);

  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
      }}
      gap={2}
    >
      <PropertyName
        style={props.currentStyle}
        properties={borderStyleProperties}
        label="Style"
        description="Sets the style of the border"
        onReset={onReset}
      />
      <ToggleGroupControl
        style={props.currentStyle}
        styleSource={getStyleSource(props.currentStyle[firstPropertyName])}
        items={[
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
        ]}
        value={firstPropertyValue}
        properties={borderStyleProperties}
        onReset={onReset}
        onValueChange={(value) =>
          setBorderProperties({
            type: "keyword",
            value,
          })
        }
      />
    </Grid>
  );
};
