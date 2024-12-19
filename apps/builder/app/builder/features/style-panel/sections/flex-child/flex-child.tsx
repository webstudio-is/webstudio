import {
  Flex,
  Grid,
  theme,
  ToggleGroup,
  ToggleGroupButton,
  FloatingPanel,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  ToggleGroupControl,
  ToggleGroupTooltip,
} from "../../controls/toggle-group/toggle-group-control";
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
import { StyleSection } from "../../shared/style-section";
import {
  getPriorityStyleValueSource,
  PropertyLabel,
} from "../../property-label";
import { propertyDescriptions } from "@webstudio-is/css-data";
import { useState } from "react";
import { useComputedStyleDecl, useComputedStyles } from "../../shared/model";
import { createBatchUpdate, setProperty } from "../../shared/use-style-data";

export const properties = [
  "flexShrink",
  "flexGrow",
  "flexBasis",
  "alignSelf",
  "order",
] satisfies [StyleProperty, ...StyleProperty[]];

export const Section = () => {
  return (
    <StyleSection label="Flex Child" properties={properties}>
      <Flex css={{ flexDirection: "column", gap: theme.spacing[5] }}>
        <FlexChildSectionAlign />
        <FlexChildSectionSizing />
        <FlexChildSectionOrder />
      </Flex>
    </StyleSection>
  );
};

const FlexChildSectionAlign = () => {
  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyLabel
        label="Align"
        description={propertyDescriptions.alignSelf}
        properties={["alignSelf"]}
      />
      <ToggleGroupControl
        label="Align"
        properties={["alignSelf"]}
        items={[
          {
            child: <SmallXIcon />,
            description:
              "The element's alignment is determined by its parent's align-items property.",
            value: "auto",
          },
          {
            child: <ASStartIcon />,
            description:
              "The element is aligned at the start of the cross axis.",
            value: "flex-start",
          },
          {
            child: <ASEndIcon />,
            description: "The element is aligned at the end of the cross axis.",
            value: "flex-end",
          },
          {
            child: <ASCenterIcon />,
            description: "The element is centered along the cross axis.",
            value: "center",
          },
          {
            child: <ASStretchIcon />,
            description:
              "The element is stretched to fill the entire cross axis.",
            value: "stretch",
          },
          {
            child: <ASBaselineIcon />,
            description:
              "The element is aligned to the baseline of the parent.",
            value: "baseline",
          },
        ]}
      />
    </Grid>
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

const FlexChildSectionSizing = () => {
  const styles = useComputedStyles(["flexGrow", "flexShrink", "flexBasis"]);
  const [flexGrow, flexShrink, flexBasis] = styles;
  const styleValueSource = getPriorityStyleValueSource(styles);
  const selectedValue = getSizingValue(
    toValue(flexGrow.cascadedValue),
    toValue(flexShrink.cascadedValue)
  );
  const items = [
    {
      child: <SmallXIcon />,
      description: "Don't grow or shrink",
      value: "none",
      codeLines: ["flex-grow: 0;", "flex-shrink: 0;"],
    },
    {
      child: <GrowIcon />,
      title: "Flex",
      description:
        "Item will expand to take up available space within a flex container if needed, but it will not shrink if there is limited space.",
      value: "grow",
      codeLines: ["flex-grow: 1;", "flex-shrink: 0;"],
    },
    {
      child: <ShrinkIcon />,
      title: "Flex",
      description:
        "Item will not grow to take up available space within a flex container, but it will shrink if there is limited space",
      value: "shrink",
      codeLines: ["flex-grow: 0;", "flex-shrink: 1;"],
    },
    {
      child: <FlexChildSectionSizingPopover />,
      title: "Flex",
      description:
        "More sizing options, set flex-basis, flex-grow, flex-shrink individually",
      value: "",
      codeLines: [
        `flex-basis: ${toValue(flexBasis.cascadedValue)};`,
        `flex-grow: ${toValue(flexGrow.cascadedValue)};`,
        `flex-shrink: ${toValue(flexShrink.cascadedValue)};`,
      ],
    },
  ];
  // Issue: The tooltip's grace area is too big and overlaps with nearby buttons,
  // preventing the tooltip from changing when the buttons are hovered over in certain cases.
  // To solve issue and allow tooltips to change on button hover,
  // we close the button tooltip in the ToggleGroupButton.onMouseEnter handler.
  // onMouseEnter used to preserve default hovering behavior on tooltip.
  const [activeTooltip, setActiveTooltip] = useState<undefined | string>();
  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyLabel
        label="Sizing"
        description="Specifies the ability of a flex item to grow, shrink, or set its initial size within a flex container."
        properties={["flexGrow", "flexShrink", "flexBasis"]}
      />

      {/* We don't support "flex" shorthand and
        this control is manipulating 3 properties at once */}
      <ToggleGroup
        color={styleValueSource}
        type="single"
        value={selectedValue}
        onValueChange={(value) => {
          const batch = createBatchUpdate();
          let flexGrow: undefined | number;
          let flexShrink: undefined | number;
          if (value === "none") {
            flexGrow = 0;
            flexShrink = 0;
          }
          if (value === "grow") {
            flexGrow = 1;
            flexShrink = 0;
          }
          if (value === "shrink") {
            flexGrow = 0;
            flexShrink = 1;
          }
          if (flexGrow !== undefined && flexShrink !== undefined) {
            batch.setProperty("flexGrow")({
              type: "unit",
              value: flexGrow,
              unit: "number",
            });
            batch.setProperty("flexShrink")({
              type: "unit",
              value: flexShrink,
              unit: "number",
            });
          }
          batch.publish();
        }}
      >
        {items.map((item) => (
          <ToggleGroupTooltip
            key={item.value}
            isOpen={item.value === activeTooltip}
            onOpenChange={(isOpen) =>
              setActiveTooltip(isOpen ? item.value : undefined)
            }
            isSelected={item.value === selectedValue}
            label="Sizing"
            code={item.codeLines.join("\n")}
            description={item.description}
            properties={["flexGrow", "flexShrink", "flexBasis"]}
          >
            <ToggleGroupButton
              aria-checked={item.value === selectedValue}
              value={item.value}
              onMouseEnter={() =>
                // reset only when highlighted is not active
                setActiveTooltip((prevValue) =>
                  prevValue === item.value ? prevValue : undefined
                )
              }
            >
              {item.child}
            </ToggleGroupButton>
          </ToggleGroupTooltip>
        ))}
      </ToggleGroup>
    </Grid>
  );
};

const FlexChildSectionSizingPopover = () => {
  return (
    <FloatingPanel
      title="Sizing"
      placement="bottom"
      content={
        <Grid
          gap="3"
          css={{
            gridTemplateColumns: "1fr 1fr 1.5fr",
            padding: theme.panel.padding,
          }}
        >
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyLabel
              properties={["flexGrow"]}
              description={propertyDescriptions.flexGrow}
              label="Grow"
            />
            <TextControl property="flexGrow" />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyLabel
              label="Shrink"
              description={propertyDescriptions.flexShrink}
              properties={["flexShrink"]}
            />
            <TextControl property="flexShrink" />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyLabel
              label="Basis"
              description={propertyDescriptions.flexBasis}
              properties={["flexBasis"]}
            />
            <TextControl property="flexBasis" />
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

const FlexChildSectionOrder = () => {
  const order = useComputedStyleDecl("order");
  const selectedValue = toValue(order.cascadedValue);
  const items = [
    {
      child: <SmallXIcon />,
      description: "Don't change",
      value: "0",
      code: "order: 0;",
    },
    {
      child: <OrderFirstIcon />,
      description: "Make first",
      value: "-1",
      code: "order: -1;",
    },
    {
      child: <OrderLastIcon />,
      description: "Make last",
      value: "1",
      code: "order: 1;",
    },
    {
      child: <FlexChildSectionOrderPopover />,
      description: "Customize order",
      value: "",
      code: `order: ${selectedValue};`,
    },
  ];
  // Issue: The tooltip's grace area is too big and overlaps with nearby buttons,
  // preventing the tooltip from changing when the buttons are hovered over in certain cases.
  // To solve issue and allow tooltips to change on button hover,
  // we close the button tooltip in the ToggleGroupButton.onMouseEnter handler.
  // onMouseEnter used to preserve default hovering behavior on tooltip.
  const [activeTooltip, setActiveTooltip] = useState<undefined | string>();
  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyLabel
        label="Order"
        description={propertyDescriptions.order}
        properties={["order"]}
      />
      <ToggleGroup
        color={order.source.name}
        type="single"
        value={selectedValue}
        onValueChange={(value) => {
          switch (value) {
            case "0":
            case "1":
            case "-1": {
              setProperty("order")({
                type: "unit",
                value: Number(value),
                unit: "number",
              });
              break;
            }
          }
        }}
      >
        {items.map((item) => (
          <ToggleGroupTooltip
            key={item.value}
            isOpen={item.value === activeTooltip}
            onOpenChange={(isOpen) =>
              setActiveTooltip(isOpen ? item.value : undefined)
            }
            isSelected={item.value === selectedValue}
            label="Sizing"
            code={item.code}
            description={item.description}
            properties={["flexGrow", "flexShrink", "flexBasis"]}
          >
            <ToggleGroupButton
              aria-checked={
                item.value === selectedValue ||
                // flex-order takes integer value, so the value can be anything from +- 0-9
                // And we already have toggle buttons for -1, 0, 1
                // https://developer.mozilla.org/en-US/docs/Web/CSS/order#formal_syntax
                (item.value === "" &&
                  (Number.parseFloat(selectedValue) > 1 ||
                    Number.parseFloat(selectedValue) < -1))
              }
              value={item.value}
              onMouseEnter={() =>
                // reset only when highlighted is not active
                setActiveTooltip((prevValue) =>
                  prevValue === item.value ? prevValue : undefined
                )
              }
            >
              {item.child}
            </ToggleGroupButton>
          </ToggleGroupTooltip>
        ))}
      </ToggleGroup>
    </Grid>
  );
};

const FlexChildSectionOrderPopover = () => {
  return (
    <FloatingPanel
      title="Order"
      placement="bottom"
      content={
        <Grid css={{ padding: theme.panel.padding }}>
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }} gap={2}>
            <PropertyLabel
              label="Order"
              description={propertyDescriptions.order}
              properties={["order"]}
            />
            <TextControl property="order" />
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
