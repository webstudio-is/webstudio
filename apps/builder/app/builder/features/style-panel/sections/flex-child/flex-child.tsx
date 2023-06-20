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
        onValueChange={(value) => setAlignSelf({ type: "keyword", value })}
        value={toValue(currentStyle.alignSelf?.value)}
        items={[
          {
            child: <SmallXIcon />,
            label: "Do not align self",
            value: "auto",
          },
          {
            child: <ASStartIcon />,
            label: "align-self: flex-start",
            value: "start",
          },
          {
            child: <ASEndIcon />,
            label: "align-self: flex-end",
            value: "end",
          },
          {
            child: <ASCenterIcon />,
            label: "align-self: center",
            value: "center",
          },
          {
            child: <ASStretchIcon />,
            label: "align-self: stretch",
            value: "stretch",
          },
          {
            child: <ASBaselineIcon />,
            label: "align-self: baseline",
            value: "baseline",
          },
        ]}
      />
    </Grid>
  );
};

const FlexChildSectionSizing = (props: RenderCategoryProps) => {
  const { createBatchUpdate, currentStyle } = props;
  const setSizing = createBatchUpdate();

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyName
        style={currentStyle}
        properties={["flexGrow", "flexShrink"]}
        label="Sizing"
        description="Specifies the ability of a flex item to grow or shrink"
        onReset={() => {
          setSizing.deleteProperty("flexGrow");
          setSizing.deleteProperty("flexShrink");
          setSizing.publish();
        }}
      />
      <ToggleGroupControl
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
            label: "Don't grow or shrink",
            value: "none",
          },
          {
            child: <GrowIcon />,
            label: "Grow if possible",
            value: "grow",
          },
          {
            child: <ShrinkIcon />,
            label: "Shrink if needed",
            value: "shrink",
          },
          {
            child: <FlexChildSectionSizingPopover {...props} />,
            label: "More sizing options",
            value: "",
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
            label: "Dont't change",
            value: "0",
          },
          {
            child: <OrderFirstIcon />,
            label: "Make first",
            value: "1",
          },
          {
            child: <OrderLastIcon />,
            label: "Make last",
            value: "-1",
          },
          {
            child: <FlexChildSectionOrderPopover {...props} />,
            label: "Customize order",
            value: "",
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
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
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
