import type { StyleProperty } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import { Flex, Grid } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";
import {
  SelectControl,
  TextControl,
  ObjectPositionControl,
} from "../../controls";
import {
  EyeconOpenIcon,
  EyeconClosedIcon,
  ScrollIcon,
  AutoScrollIcon,
} from "@webstudio-is/icons";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { theme } from "@webstudio-is/design-system";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";

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
  const { label } = styleConfigByName(property);
  return (
    <Grid gap={1}>
      <PropertyName
        label={label}
        properties={[property]}
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

const properties: StyleProperty[] = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "overflow",
  "objectFit",
  "objectPosition",
  "aspectRatio",
];

export const SizeSection = ({
  currentStyle: style,
  setProperty,
  deleteProperty,
}: RenderCategoryProps) => {
  return (
    <CollapsibleSection
      label="Size"
      currentStyle={style}
      properties={properties}
    >
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
          label={styleConfigByName("aspectRatio").label}
          properties={["aspectRatio"]}
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
          label={styleConfigByName("overflow").label}
          properties={["overflow"]}
          style={style}
          onReset={() => deleteProperty("overflow")}
        />
        <ToggleGroupControl
          onReset={() => deleteProperty("overflow")}
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
        <PropertyName
          label={styleConfigByName("objectFit").label}
          properties={["objectFit"]}
          style={style}
          onReset={() => deleteProperty("objectFit")}
        />
        <SelectControl
          property="objectFit"
          currentStyle={style}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
      <Flex justify="between">
        <PropertyName
          label={styleConfigByName("objectPosition").label}
          properties={["objectPosition"]}
          style={style}
          onReset={() => deleteProperty("objectPosition")}
        />
        <ObjectPositionControl
          property="objectPosition"
          currentStyle={style}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Flex>
    </CollapsibleSection>
  );
};
