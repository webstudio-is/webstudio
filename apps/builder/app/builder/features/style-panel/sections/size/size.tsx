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
  style: SectionProps["currentStyle"];
  setProperty: SectionProps["setProperty"];
  deleteProperty: SectionProps["deleteProperty"];
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
  currentStyle: style,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  return (
    <CollapsibleSection
      label="Size"
      currentStyle={style}
      properties={properties}
      fullWidth
    >
      <SectionLayout columns={2}>
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
      </SectionLayout>
      <Separator />
      <SectionLayout columns={2}>
        <PropertyName
          label={styleConfigByName("overflow").label}
          properties={["overflow"]}
          style={style}
          onReset={() => deleteProperty("overflow")}
        />
        <ToggleGroupControl
          style={style}
          items={[
            {
              child: <EyeconOpenIcon />,
              title: "Overflow",
              description:
                "Content is fully visible and extends beyond the container if it exceeds its size.",
              value: "visible",
              propertyValues: "overflow: visible;",
            },
            {
              child: <EyeconClosedIcon />,
              title: "Overflow",
              description:
                "Content that exceeds the container's size is clipped and hidden without scrollbars.",
              value: "hidden",
              propertyValues: "overflow: hidden;",
            },
            {
              child: <ScrollIcon />,
              title: "Overflow",
              description:
                "Scrollbars are added to the container, allowing users to scroll and view the exceeding content.",
              value: "scroll",
              propertyValues: "overflow: scroll;",
            },
            {
              child: <AutoScrollIcon />,
              title: "Overflow",
              description:
                "Scrollbars are added to the container only when necessary, based on the content size.",
              value: "auto",
              propertyValues: "overflow: auto;",
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
      </SectionLayout>
    </CollapsibleSection>
  );
};
