import type { StyleProperty } from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import { Grid, Separator, styled } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import type { SectionProps } from "../shared/section-component";
import { PropertyName } from "../../shared/property-name";
import {
  SelectControl,
  TextControl,
  ObjectPositionControl,
  type ControlProps,
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
  currentStyle,
  setProperty,
  deleteProperty,
}: {
  property: StyleProperty;
  currentStyle: SectionProps["currentStyle"];
  setProperty: SectionProps["setProperty"];
  deleteProperty: SectionProps["deleteProperty"];
}) => {
  const { label } = styleConfigByName(property);
  return (
    <Grid gap={1}>
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

const overflowItems = new Map([
  [
    "visible",
    {
      child: <EyeconOpenIcon />,
      title: "Overflow",
      description:
        "Content is fully visible and extends beyond the container if it exceeds its size.",
      value: "visible",
      propertyValues: "overflow: visible;",
    },
  ],
  [
    "hidden",
    {
      child: <EyeconClosedIcon />,
      title: "Overflow",
      description:
        "Content that exceeds the container's size is clipped and hidden without scrollbars.",
      value: "hidden",
      propertyValues: "overflow: hidden;",
    },
  ],
  [
    "scroll",
    {
      child: <ScrollIcon />,
      title: "Overflow",
      description:
        "Scrollbars are added to the container, allowing users to scroll and view the exceeding content.",
      value: "scroll",
      propertyValues: "overflow: scroll;",
    },
  ],
  [
    "auto",
    {
      child: <AutoScrollIcon />,
      title: "Overflow",
      description:
        "Scrollbars are added to the container only when necessary, based on the content size.",
      value: "auto",
      propertyValues: "overflow: auto;",
    },
  ],
]);

const OverflowControl = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
}: ControlProps) => {
  const value = toValue(currentStyle.overflow?.value);
  if (overflowItems.has(value) === false) {
    return (
      <SelectControl
        property={property}
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
    );
  }
  return (
    <ToggleGroupControl
      style={currentStyle}
      items={Array.from(overflowItems.values())}
      value={value}
      onValueChange={(value) =>
        setProperty(property)({ type: "keyword", value })
      }
    />
  );
};

export const properties = [
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
] satisfies Array<StyleProperty>;

const SectionLayout = styled(Grid, {
  columnGap: theme.spacing[5],
  rowGap: theme.spacing[5],
  px: theme.spacing[9],
});

export const Section = ({
  currentStyle,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  return (
    <CollapsibleSection
      label="Size"
      currentStyle={currentStyle}
      properties={properties}
      fullWidth
    >
      <SectionLayout columns={2}>
        <SizeField
          property="width"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeField
          property="height"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeField
          property="minWidth"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeField
          property="minHeight"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeField
          property="maxWidth"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeField
          property="maxHeight"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <PropertyName
          label={styleConfigByName("aspectRatio").label}
          properties={["aspectRatio"]}
          style={currentStyle}
          onReset={() => deleteProperty("aspectRatio")}
        />
        <TextControl
          property={"aspectRatio"}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </SectionLayout>
      <Separator />
      <SectionLayout columns={2}>
        <PropertyName
          label={styleConfigByName("overflow").label}
          properties={["overflow"]}
          style={currentStyle}
          onReset={() => deleteProperty("overflow")}
        />
        <OverflowControl
          property="overflow"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <PropertyName
          label={styleConfigByName("objectFit").label}
          properties={["objectFit"]}
          style={currentStyle}
          onReset={() => deleteProperty("objectFit")}
        />
        <SelectControl
          property="objectFit"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <PropertyName
          label={styleConfigByName("objectPosition").label}
          properties={["objectPosition"]}
          style={currentStyle}
          onReset={() => deleteProperty("objectPosition")}
        />
        <ObjectPositionControl
          property="objectPosition"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </SectionLayout>
    </CollapsibleSection>
  );
};
