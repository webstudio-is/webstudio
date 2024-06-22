import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  Flex,
  Grid,
  IconButton,
  Separator,
  styled,
} from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import type { SectionProps } from "../shared/section";
import { PropertyName } from "../../shared/property-name";
import {
  PositionControl,
  SelectControl,
  TextControl,
  type ControlProps,
} from "../../controls";
import {
  EyeconOpenIcon,
  EyeconClosedIcon,
  ScrollIcon,
  AutoScrollIcon,
  EllipsesIcon,
} from "@webstudio-is/icons";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { theme } from "@webstudio-is/design-system";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import { getStyleSourceColor } from "../../shared/style-info";
import { FloatingPanel } from "~/builder/shared/floating-panel";

const SizeProperty = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
}: ControlProps) => {
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

const ObjectPosition = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
  isAdvanced,
}: ControlProps) => {
  const styleSourceColor = getStyleSourceColor({
    properties: [property],
    currentStyle,
  });

  return (
    <Flex justify="end">
      <FloatingPanel
        title="Object Position"
        content={
          <Flex css={{ px: theme.spacing[9], py: theme.spacing[5] }}>
            <PositionControl
              property={property}
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
              isAdvanced={isAdvanced}
            />
          </Flex>
        }
      >
        <IconButton
          variant={styleSourceColor}
          onClick={(event) => {
            if (event.altKey) {
              event.preventDefault();
              deleteProperty(property);
            }
          }}
        >
          <EllipsesIcon />
        </IconButton>
      </FloatingPanel>
    </Flex>
  );
};

export const properties = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "overflowX",
  "overflowY",
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
  createBatchUpdate,
}: SectionProps) => {
  return (
    <CollapsibleSection
      label="Size"
      currentStyle={currentStyle}
      properties={properties}
      fullWidth
    >
      <SectionLayout columns={2}>
        <SizeProperty
          property="width"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeProperty
          property="height"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeProperty
          property="minWidth"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeProperty
          property="minHeight"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeProperty
          property="maxWidth"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <SizeProperty
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
          label="Overflow"
          properties={["overflowX", "overflowY"]}
          style={currentStyle}
          onReset={() => {
            const batch = createBatchUpdate();
            deleteProperty("overflowX");
            deleteProperty("overflowY");
            batch.publish();
          }}
        />
        <ToggleGroupControl
          property="overflowX"
          currentStyle={currentStyle}
          setProperty={() => (value) => {
            const batch = createBatchUpdate();
            batch.setProperty("overflowX")(value);
            batch.setProperty("overflowY")(value);
            batch.publish();
          }}
          deleteProperty={() => {
            const batch = createBatchUpdate();
            batch.deleteProperty("overflowX");
            batch.deleteProperty("overflowY");
            batch.publish();
          }}
          items={[
            {
              child: <EyeconOpenIcon />,
              title: "Overflow",
              description:
                "Content is fully visible and extends beyond the container if it exceeds its size.",
              value: "visible",
              propertyValues: "overflow-x: visible;\noverflow-y: visible;",
            },
            {
              child: <EyeconClosedIcon />,
              title: "Overflow",
              description:
                "Content that exceeds the container's size is clipped and hidden without scrollbars.",
              value: "hidden",
              propertyValues: "overflow-x: hidden;\noverflow-y: hidden;",
            },
            {
              child: <ScrollIcon />,
              title: "Overflow",
              description:
                "Scrollbars are added to the container, allowing users to scroll and view the exceeding content.",
              value: "scroll",
              propertyValues: "overflow-x: scroll;\noverflow-y: scroll;",
            },

            {
              child: <AutoScrollIcon />,
              title: "Overflow",
              description:
                "Scrollbars are added to the container only when necessary, based on the content size.",
              value: "auto",
              propertyValues: "overflow-x: auto;\noverflow-y: auto;",
            },
          ]}
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
        <ObjectPosition
          property="objectPosition"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </SectionLayout>
    </CollapsibleSection>
  );
};
