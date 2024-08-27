import { Flex, Grid, theme } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import type { SectionProps } from "../shared/section";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import { TextControl } from "../../controls";
import {
  SmallXIcon,
  ASStartIcon,
  ASEndIcon,
  ASCenterIcon,
  ASBaselineIcon,
  ASStretchIcon,
  ShrinkIcon,
  GrowIcon,
  OrderFirstIcon,
  OrderLastIcon,
  EllipsesIcon,
} from "@webstudio-is/icons";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { PropertyLabel } from "../../property-label";
import { propertyDescriptions } from "@webstudio-is/css-data";

export const properties = [
  "flexShrink",
  "flexGrow",
  "flexBasis",
  "alignSelf",
  "order",
] satisfies Array<StyleProperty>;

export const Section = (props: SectionProps) => {
  return (
    <CollapsibleSection
      label="Flex Child"
      currentStyle={props.currentStyle}
      properties={properties}
    >
      <Flex css={{ flexDirection: "column", gap: theme.spacing[5] }}>
        <FlexChildSectionAlign {...props} />
        <FlexChildSectionSizing {...props} />
        <FlexChildSectionOrder {...props} />
      </Flex>
    </CollapsibleSection>
  );
};

const FlexChildSectionAlign = (props: SectionProps) => {
  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyLabel
        label="Align"
        description={propertyDescriptions.alignSelf}
        properties={["alignSelf"]}
      />
      <ToggleGroupControl
        {...props}
        // We don't support "flex" shorthand and this control is manipulating 3 properties at once
        property="alignSelf"
        items={[
          {
            child: <SmallXIcon />,
            title: "Align",
            description:
              "The element's alignment is determined by its parent's align-items property.",
            value: "auto",
            propertyValues: "align-self: auto;",
          },
          {
            child: <ASStartIcon />,
            title: "Align",
            description:
              "The element is aligned at the start of the cross axis.",
            value: "flex-start",
            propertyValues: "align-self: flex-start;",
          },
          {
            child: <ASEndIcon />,
            title: "Align",
            description: "The element is aligned at the end of the cross axis.",
            value: "flex-end",
            propertyValues: "align-self: flex-end;",
          },
          {
            child: <ASCenterIcon />,
            title: "Align",
            description: "The element is centered along the cross axis.",
            value: "center",
            propertyValues: "align-self: center;",
          },
          {
            child: <ASStretchIcon />,
            title: "Align",
            description:
              "The element is stretched to fill the entire cross axis.",
            value: "stretch",
            propertyValues: "align-self: stretch;",
          },
          {
            child: <ASBaselineIcon />,
            title: "Align",
            description:
              "The element is aligned to the baseline of the parent.",
            value: "baseline",
            propertyValues: "align-self: baseline;",
          },
        ]}
      />
    </Grid>
  );
};

const FlexChildSectionSizing = (props: SectionProps) => {
  const { createBatchUpdate, currentStyle } = props;
  const setSizing = createBatchUpdate();
  const onReset = () => {
    setSizing.deleteProperty("flexGrow");
    setSizing.deleteProperty("flexShrink");
    setSizing.deleteProperty("flexBasis");
    setSizing.publish();
  };

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyLabel
        label="Sizing"
        description="Specifies the ability of a flex item to grow, shrink, or set its initial size within a flex container."
        properties={["flexGrow", "flexShrink", "flexBasis"]}
      />
      <ToggleGroupControl
        {...props}
        // We don't support "flex" shorthand and this control is manipulating 3 properties at once
        property="flexGrow"
        deleteProperty={onReset}
        setProperty={() => {
          return (styleValue: StyleValue) => {
            if (styleValue.type !== "keyword") {
              // should not happen
              return;
            }
            switch (styleValue.value) {
              case "none": {
                setSizing.setProperty("flexGrow")({
                  type: "unit",
                  value: 0,
                  unit: "number",
                });
                setSizing.setProperty("flexShrink")({
                  type: "unit",
                  value: 0,
                  unit: "number",
                });
                setSizing.publish();
                break;
              }
              case "grow": {
                setSizing.setProperty("flexGrow")({
                  type: "unit",
                  value: 1,
                  unit: "number",
                });
                setSizing.setProperty("flexShrink")({
                  type: "unit",
                  value: 0,
                  unit: "number",
                });
                setSizing.publish();
                break;
              }
              case "shrink": {
                setSizing.setProperty("flexGrow")({
                  type: "unit",
                  value: 0,
                  unit: "number",
                });
                setSizing.setProperty("flexShrink")({
                  type: "unit",
                  value: 1,
                  unit: "number",
                });
                setSizing.publish();
                break;
              }
            }
          };
        }}
        value={getSizingValue(
          toValue(currentStyle.flexGrow?.value),
          toValue(currentStyle.flexShrink?.value)
        )}
        items={[
          {
            child: <SmallXIcon />,
            title: "Flex",
            description: "Don't grow or shrink",
            value: "none",
            propertyValues: ["flex-grow: 0;", "flex-shrink: 0;"],
          },
          {
            child: <GrowIcon />,
            title: "Flex",
            description:
              "Item will expand to take up available space within a flex container if needed, but it will not shrink if there is limited space.",
            value: "grow",
            propertyValues: ["flex-grow: 1;", "flex-shrink: 0;"],
          },
          {
            child: <ShrinkIcon />,
            title: "Flex",
            description:
              "Item will not grow to take up available space within a flex container, but it will shrink if there is limited space",
            value: "shrink",
            propertyValues: ["flex-grow: 0;", "flex-shrink: 1;"],
          },
          {
            child: <FlexChildSectionSizingPopover {...props} />,
            title: "Flex",
            description:
              "More sizing options, set flex-basis, flex-grow, flex-shrink individually",
            value: "",
            propertyValues: [
              `flex-basis: ${toValue(currentStyle.flexBasis?.value)};`,
              `flex-grow: ${toValue(currentStyle.flexGrow?.value)};`,
              `flex-shrink: ${toValue(currentStyle.flexShrink?.value)};`,
            ],
          },
        ]}
      />
    </Grid>
  );
};

const FlexChildSectionSizingPopover = ({
  currentStyle,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  return (
    <FloatingPanel
      title="Sizing"
      content={
        <Grid
          css={{
            gridTemplateColumns: "1fr 1fr 1.5fr",
            gap: theme.spacing[9],
            padding: theme.spacing[9],
          }}
        >
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyLabel
              properties={["flexGrow"]}
              description={propertyDescriptions.flexGrow}
              label="Grow"
            />
            <TextControl
              property="flexGrow"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyLabel
              label="Shrink"
              description={propertyDescriptions.flexShrink}
              properties={["flexShrink"]}
            />
            <TextControl
              property="flexShrink"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyLabel
              label="Basis"
              description={propertyDescriptions.flexBasis}
              properties={["flexBasis"]}
            />
            <TextControl
              property="flexBasis"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
        </Grid>
      }
    >
      <Flex>
        <EllipsesIcon />
      </Flex>
    </FloatingPanel>
  );
};

const FlexChildSectionOrder = (props: SectionProps) => {
  const { setProperty, currentStyle } = props;
  const setOrder = setProperty("order");

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyLabel
        label="Order"
        description={propertyDescriptions.order}
        properties={["order"]}
      />
      <ToggleGroupControl
        {...props}
        property="order"
        setProperty={() => {
          return (styleValue: StyleValue) => {
            if (styleValue.type !== "keyword") {
              // should not happen
              return;
            }
            switch (styleValue.value) {
              case "0":
              case "1":
              case "-1": {
                setOrder({
                  type: "unit",
                  value: Number(styleValue.value),
                  unit: "number",
                });
                break;
              }
            }
          };
        }}
        items={[
          {
            child: <SmallXIcon />,
            title: "Order",
            description: "Dont't change",
            value: "0",
            propertyValues: "order: 0;",
          },
          {
            child: <OrderFirstIcon />,
            title: "Order",
            description: "Make first",
            value: "-1",
            propertyValues: "order: -1;",
          },
          {
            child: <OrderLastIcon />,
            title: "Order",
            description: "Make last",
            value: "1",
            propertyValues: "order: 1;",
          },
          {
            child: <FlexChildSectionOrderPopover {...props} />,
            title: "Order",
            description: "Customize order",
            value: "",
            propertyValues: `order: ${toValue(currentStyle.order?.value)};`,
          },
        ]}
      />
    </Grid>
  );
};

const FlexChildSectionOrderPopover = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  return (
    <FloatingPanel
      title="Order"
      content={
        <Grid css={{ padding: theme.spacing[9] }}>
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
            <PropertyLabel
              label="Order"
              description={propertyDescriptions.order}
              properties={["order"]}
            />
            <TextControl
              property="order"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
        </Grid>
      }
    >
      <Flex>
        <EllipsesIcon />
      </Flex>
    </FloatingPanel>
  );
};

const getSizingValue = (flexGrow: string, flexShrink: string) => {
  if (flexGrow === "0" && flexShrink === "0") {
    return "none";
  }
  if (flexGrow === "1" && flexShrink === "0") {
    return "grow";
  }
  if (flexGrow === "0" && flexShrink === "1") {
    return "shrink";
  }
  return "";
};
