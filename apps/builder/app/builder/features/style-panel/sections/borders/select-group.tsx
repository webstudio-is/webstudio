import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import { Grid } from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { SelectControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import type { SectionProps } from "..";
import type { StyleInfo } from "../../shared/style-info";

export const canUseToggleGroup = (
  properties: Array<StyleProperty>,
  currentStyle: StyleInfo
) => {
  const values = properties.map((property) =>
    toValue(currentStyle[property]?.value)
  );

  // We can represent the value with a toggle group if all values are the same.
  return (
    values[0] === values[1] &&
    values[0] === values[2] &&
    values[0] === values[3]
  );
};

export const SelectGroup = ({
  properties,
  ...props
}: SectionProps & { properties: Array<StyleProperty> }) => {
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
};
