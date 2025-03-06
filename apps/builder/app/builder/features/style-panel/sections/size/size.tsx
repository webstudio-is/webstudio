import {
  camelCaseProperty,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import type { CssProperty } from "@webstudio-is/css-engine";
import {
  Flex,
  Grid,
  IconButton,
  Separator,
  styled,
  FloatingPanel,
  theme,
} from "@webstudio-is/design-system";
import { PositionControl, SelectControl, TextControl } from "../../controls";
import {
  EyeOpenIcon,
  EyeClosedIcon,
  ScrollIcon,
  AutoScrollIcon,
  EllipsesIcon,
} from "@webstudio-is/icons";
import { StyleSection } from "../../shared/style-section";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import { humanizeString } from "~/shared/string-utils";
import { PropertyLabel } from "../../property-label";
import { useComputedStyleDecl } from "../../shared/model";
import { deleteProperty } from "../../shared/use-style-data";

const SizeProperty = ({ property }: { property: CssProperty }) => {
  return (
    <Grid gap={1}>
      <PropertyLabel
        label={humanizeString(property)}
        description={propertyDescriptions[camelCaseProperty(property)]}
        properties={[property]}
      />
      <TextControl property={property} />
    </Grid>
  );
};

const ObjectPosition = () => {
  const styleDecl = useComputedStyleDecl("object-position");
  return (
    <Flex justify="end">
      <FloatingPanel
        title="Object Position"
        placement="bottom"
        content={
          <Flex css={{ padding: theme.panel.padding }}>
            <PositionControl property="object-position" styleDecl={styleDecl} />
          </Flex>
        }
      >
        <IconButton
          variant={styleDecl.source.name}
          onClick={(event) => {
            if (event.altKey) {
              event.preventDefault();
              deleteProperty("object-position");
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
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "overflow-x",
  "overflow-y",
  "object-fit",
  "object-position",
  "aspect-ratio",
] satisfies Array<CssProperty>;

const SectionLayout = styled(Grid, {
  columnGap: theme.spacing[5],
  rowGap: theme.spacing[5],
  paddingInline: theme.panel.paddingInline,
});

export const Section = () => {
  return (
    <StyleSection label="Size" properties={properties} fullWidth>
      <SectionLayout columns={2}>
        <SizeProperty property="width" />
        <SizeProperty property="height" />
        <SizeProperty property="min-width" />
        <SizeProperty property="min-height" />
        <SizeProperty property="max-width" />
        <SizeProperty property="max-height" />
        <PropertyLabel
          label="Aspect Ratio"
          description={propertyDescriptions.aspectRatio}
          properties={["aspect-ratio"]}
        />
        <TextControl property="aspect-ratio" />
      </SectionLayout>
      <Separator />
      <SectionLayout columns={2}>
        <PropertyLabel
          label="Overflow"
          description={propertyDescriptions.overflow}
          properties={["overflow-x", "overflow-y"]}
        />
        <ToggleGroupControl
          label="Overflow"
          properties={["overflow-x", "overflow-y"]}
          items={[
            {
              child: <EyeOpenIcon />,
              description:
                "Content is fully visible and extends beyond the container if it exceeds its size.",
              value: "visible",
            },
            {
              child: <EyeClosedIcon />,
              description:
                "Content that exceeds the container's size is clipped and hidden without scrollbars.",
              value: "hidden",
            },
            {
              child: <ScrollIcon />,
              description:
                "Scrollbars are added to the container, allowing users to scroll and view the exceeding content.",
              value: "scroll",
            },

            {
              child: <AutoScrollIcon />,
              description:
                "Scrollbars are added to the container only when necessary, based on the content size.",
              value: "auto",
            },
          ]}
        />
        <PropertyLabel
          label="Object Fit"
          description={propertyDescriptions.objectFit}
          properties={["object-fit"]}
        />
        <SelectControl property="object-fit" />
        <PropertyLabel
          label="Object Position"
          description={propertyDescriptions.objectPosition}
          properties={["object-position"]}
        />
        <ObjectPosition />
      </SectionLayout>
    </StyleSection>
  );
};
