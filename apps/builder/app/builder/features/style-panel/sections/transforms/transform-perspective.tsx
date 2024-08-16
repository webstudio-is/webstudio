import { type StyleProperty } from "@webstudio-is/css-engine";
import { Grid, theme } from "@webstudio-is/design-system";
import { TextControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";
import type { SectionProps } from "../shared/section";

const property: StyleProperty = "perspective";

export const TransformPerspective = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const { label } = styleConfigByName(property);
  const value = currentStyle[property]?.local;

  if (value?.type !== "keyword" && value?.type !== "unit") {
    return;
  }

  return (
    <Grid
      css={{
        px: theme.spacing[9],
        gridTemplateColumns: `2fr 1fr`,
      }}
    >
      <PropertyName
        label={label}
        properties={[property]}
        style={currentStyle}
        onReset={() => deleteProperty(property)}
      />
      <TextControl
        property={property}
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
    </Grid>
  );
};
