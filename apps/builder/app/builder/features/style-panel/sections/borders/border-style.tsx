import type { StyleProperty } from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import { Grid } from "@webstudio-is/design-system";
import {
  DashBorderIcon,
  DashedBorderIcon,
  DottedBorderIcon,
  SmallXIcon,
} from "@webstudio-is/icons";
import { PropertyName } from "../../shared/property-name";
import type { SectionProps } from "../shared/section-component";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";
import { getStyleSource } from "../../shared/style-info";
import {
  declarationDescriptions,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import { deleteAllProperties, setAllProperties, rowCss } from "./utils";
import { SelectGroup, canUseToggleGroup } from "./select-group";

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

  const firstPropertyValue = toValue(
    props.currentStyle[firstPropertyName]?.value ?? {
      type: "keyword",
      value: "none",
    }
  );
  const onResetAll = () => deleteBorderProperties(firstPropertyName);

  if (canUseToggleGroup(properties, props.currentStyle)) {
    return (
      <Grid css={rowCss}>
        <PropertyName
          style={props.currentStyle}
          properties={properties}
          label="Style"
          description={propertyDescriptions.borderBlockStyle}
          onReset={onResetAll}
        />
        <ToggleGroupControl
          style={props.currentStyle}
          styleSource={getStyleSource(props.currentStyle[firstPropertyName])}
          items={items}
          value={firstPropertyValue}
          properties={properties}
          onReset={onResetAll}
          onValueChange={(value) =>
            setBorderProperties({
              type: "keyword",
              value,
            })
          }
        />
      </Grid>
    );
  }

  return <SelectGroup {...props} properties={properties} />;
};
