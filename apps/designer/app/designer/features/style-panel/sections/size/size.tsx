import type { StyleProperty } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import { Grid } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";
import { TextControl } from "../../controls";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";
import {
  EyeconOpenIcon,
  EyeconClosedIcon,
  ScrollIcon,
  AutoScrollIcon,
} from "@webstudio-is/icons";
import { getStyleSource } from "../../shared/style-info";
import { theme } from "@webstudio-is/design-system";

const SizeField = ({
  property,
  style,
  setProperty,
  deleteProperty,
}: {
  property: StyleProperty;
  style: RenderCategoryProps["currentStyle"];
  setProperty: RenderCategoryProps["setProperty"];
  deleteProperty: RenderCategoryProps["deleteProperty"];
}) => {
  const { label } = styleConfigByName[property];
  return (
    <Grid gap={1}>
      <PropertyName
        label={label}
        property={property}
        style={style}
        onReset={() => deleteProperty(property)}
      />
      <TextControl
        property={property}
        currentStyle={style}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
    </Grid>
  );
};

export const SizeSection = ({
  currentStyle: style,
  setProperty,
  deleteProperty,
}: RenderCategoryProps) => {
  return (
    <Grid
      columns={2}
      css={{ columnGap: theme.spacing[5], rowGap: theme.spacing[7] }}
    >
      <SizeField
        property="width"
        style={style}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <SizeField
        property="height"
        style={style}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <SizeField
        property="minWidth"
        style={style}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <SizeField
        property="minHeight"
        style={style}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <SizeField
        property="maxWidth"
        style={style}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <SizeField
        property="maxHeight"
        style={style}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <PropertyName
        label={styleConfigByName.aspectRatio.label}
        property="aspectRatio"
        style={style}
        onReset={() => deleteProperty("aspectRatio")}
      />
      <TextControl
        property={"aspectRatio"}
        currentStyle={style}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
      <PropertyName
        label={styleConfigByName.overflow.label}
        property="overflow"
        style={style}
        onReset={() => deleteProperty("overflow")}
      />
      <ToggleGroupControl
        styleSource={getStyleSource(style.overflow)}
        items={[
          {
            child: <EyeconOpenIcon />,
            label: "Visible",
            value: "visible",
          },
          {
            child: <EyeconClosedIcon />,
            label: "Hidden",
            value: "hidden",
          },
          {
            child: <ScrollIcon />,
            label: "Scroll",
            value: "scroll",
          },
          {
            child: <AutoScrollIcon />,
            label: "Auto",
            value: "auto",
          },
        ]}
        value={toValue(style.overflow?.value)}
        onValueChange={(value) =>
          setProperty("overflow")({ type: "keyword", value })
        }
      />
    </Grid>
  );
};
