import { Flex, Grid, theme } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";
import { PropertyName } from "../../shared/property-name";
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
  MenuEllipsesIcon,
} from "@webstudio-is/icons";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { CollapsibleSection } from "../../shared/collapsible-section";

const properties: StyleProperty[] = [
  "flexShrink",
  "flexGrow",
  "flexBasis",
  "alignSelf",
  "order",
];

export const FlexChildSection = (props: RenderCategoryProps) => {
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

const FlexChildSectionAlign = (props: RenderCategoryProps) => {
  const { setProperty, deleteProperty, currentStyle } = props;
  const setAlignSelf = setProperty("alignSelf");

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyName
        style={currentStyle}
        properties={["alignSelf"]}
        label="Align"
        onReset={() => deleteProperty("alignSelf")}
      />
      <ToggleGroupControl
        style={props.currentStyle}
        onValueChange={(value) => setAlignSelf({ type: "keyword", value })}
        onReset={() => deleteProperty("alignSelf")}
        value={toValue(currentStyle.alignSelf?.value)}
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

const FlexChildSectionSizing = (props: RenderCategoryProps) => {
  const { createBatchUpdate, currentStyle } = props;
  const setSizing = createBatchUpdate();
  const onReset = () => {
    setSizing.deleteProperty("flexGrow");
    setSizing.deleteProperty("flexShrink");
    setSizing.publish();
  };
  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyName
        style={currentStyle}
        properties={["flexGrow", "flexShrink"]}
        label="Sizing"
        description="Specifies the ability of a flex item to grow or shrink"
        onReset={onReset}
      />
      <ToggleGroupControl
        style={props.currentStyle}
        onReset={onReset}
        onValueChange={(value) => {
          switch (value) {
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
}: RenderCategoryProps) => {
  return (
    <FloatingPanel
      title="Sizing"
      content={
        <Grid
          css={{
            gridTemplateColumns: "1.5fr 1fr 1fr",
            gap: theme.spacing[9],
            padding: theme.spacing[9],
          }}
        >
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyName
              style={currentStyle}
              properties={["flexBasis"]}
              label="Basis"
              onReset={() => deleteProperty("flexBasis")}
            />
            <TextControl
              property="flexBasis"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyName
              style={currentStyle}
              properties={["flexGrow"]}
              label="Grow"
              onReset={() => deleteProperty("flexGrow")}
            />
            <TextControl
              property="flexGrow"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyName
              style={currentStyle}
              properties={["flexShrink"]}
              label="Shrink"
              onReset={() => deleteProperty("flexShrink")}
            />
            <TextControl
              property="flexShrink"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Grid>
        </Grid>
      }
    >
      <Flex>
        <MenuEllipsesIcon />
      </Flex>
    </FloatingPanel>
  );
};

const FlexChildSectionOrder = (props: RenderCategoryProps) => {
  const { deleteProperty, setProperty, currentStyle } = props;
  const setOrder = setProperty("order");

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyName
        style={currentStyle}
        properties={["order"]}
        label="Order"
        onReset={() => deleteProperty("order")}
      />
      <ToggleGroupControl
        style={props.currentStyle}
        onValueChange={(value) => {
          switch (value) {
            case "0":
            case "1":
            case "-1": {
              setOrder({ type: "unit", value: Number(value), unit: "number" });
              break;
            }
          }
        }}
        value={toValue(currentStyle.order?.value)}
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

const FlexChildSectionOrderPopover = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  return (
    <FloatingPanel
      title="Order"
      content={
        <Grid css={{ padding: theme.spacing[9] }}>
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
            <PropertyName
              style={currentStyle}
              properties={["order"]}
              label="Order"
              onReset={() => deleteProperty("order")}
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
        <MenuEllipsesIcon />
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
