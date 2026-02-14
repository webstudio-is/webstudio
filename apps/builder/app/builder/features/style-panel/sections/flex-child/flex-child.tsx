import {
  Flex,
  Grid,
  theme,
  ToggleGroup,
  ToggleGroupButton,
  FloatingPanel,
  SectionTitleButton,
  Tooltip,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { CssProperty } from "@webstudio-is/css-engine";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";
import { TextControl } from "../../controls";
import {
  XSmallIcon,
  ShrinkIcon,
  GrowIcon,
  EllipsesIcon,
  ExternalLinkIcon,
} from "@webstudio-is/icons";
import { StyleSection } from "../../shared/style-section";
import {
  getPriorityStyleValueSource,
  PropertyLabel,
} from "../../property-label";
import { propertyDescriptions } from "@webstudio-is/css-data";
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useComputedStyles } from "../../shared/model";
import { createBatchUpdate } from "../../shared/use-style-data";
import { AlignSelfControl } from "../shared/align-self";
import { OrderControl } from "../shared/order";
import { $selectedInstancePath, selectInstance } from "~/shared/awareness";

export const properties = [
  "flex-shrink",
  "flex-grow",
  "flex-basis",
  "align-self",
  "order",
] satisfies [CssProperty, ...CssProperty[]];

export const Section = () => {
  const instancePath = useStore($selectedInstancePath);
  // Get the parent instance (second item in the path, index 1)
  const parentInstance = instancePath?.[1];

  return (
    <StyleSection
      label="Flex child"
      properties={properties}
      suffix={
        parentInstance && (
          <Tooltip content="Select flex container">
            <SectionTitleButton
              prefix={<ExternalLinkIcon />}
              onClick={() => selectInstance(parentInstance.instanceSelector)}
            />
          </Tooltip>
        )
      }
    >
      <Flex css={{ flexDirection: "column", gap: theme.spacing[5] }}>
        <FlexChildSectionAlign />
        <FlexChildSectionSizing />
        <OrderControl />
      </Flex>
    </StyleSection>
  );
};

const FlexChildSectionAlign = () => {
  return <AlignSelfControl variant="flex" />;
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
  const styles = useComputedStyles(["flex-grow", "flex-shrink", "flex-basis"]);
  const [flexGrow, flexShrink, flexBasis] = styles;
  const styleValueSource = getPriorityStyleValueSource(styles);
  const selectedValue = getSizingValue(
    toValue(flexGrow.cascadedValue),
    toValue(flexShrink.cascadedValue)
  );
  const items = [
    {
      child: <XSmallIcon />,
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
    <Grid css={{ gridTemplateColumns: "3fr 8fr" }}>
      <PropertyLabel
        label="Sizing"
        description="Specifies the ability of a flex item to grow, shrink, or set its initial size within a flex container."
        properties={["flex-grow", "flex-shrink", "flex-basis"]}
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
            batch.setProperty("flex-grow")({
              type: "unit",
              value: flexGrow,
              unit: "number",
            });
            batch.setProperty("flex-shrink")({
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
            properties={["flex-grow", "flex-shrink", "flex-basis"]}
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
      placement="bottom-within"
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
              properties={["flex-grow"]}
              description={propertyDescriptions.flexGrow}
              label="Grow"
            />
            <TextControl property="flex-grow" />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyLabel
              label="Shrink"
              description={propertyDescriptions.flexShrink}
              properties={["flex-shrink"]}
            />
            <TextControl property="flex-shrink" />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: theme.spacing[3] }}>
            <PropertyLabel
              label="Basis"
              description={propertyDescriptions.flexBasis}
              properties={["flex-basis"]}
            />
            <TextControl property="flex-basis" />
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
