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
import {
  declarationDescriptions,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import { SelectControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";

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

  const values = properties.map((property) =>
    toValue(props.currentStyle[property]?.value)
  );

  // We can represent the value with a toggle group if all values are the same.
  const canUseToggleGroup =
    values[0] === values[1] &&
    values[0] === values[2] &&
    values[0] === values[3];

  if (canUseToggleGroup === false) {
    return (
      <Grid columns="2" gap="2">
        {properties.map((property) => (
          <Grid gap="1" css={{ gridTemplateColumns: "auto" }} key={property}>
            <PropertyName
              style={props.currentStyle}
              properties={[property]}
              label={styleConfigByName(property).label}
              onReset={() => props.deleteProperty(property)}
            />
            <SelectControl property={property} {...props} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
      }}
      gap="2"
    >
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
};
