import { useState } from "react";
import {
  Flex,
  FloatingPanel,
  Grid,
  theme,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import {
  XSmallIcon,
  OrderFirstIcon,
  OrderLastIcon,
  EllipsesIcon,
} from "@webstudio-is/icons";
import { TextControl } from "../../controls";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";
import { PropertyLabel } from "../../property-label";
import { propertyDescriptions } from "@webstudio-is/css-data";
import { useComputedStyleDecl } from "../../shared/model";
import { setProperty } from "../../shared/use-style-data";

const OrderPopover = () => {
  return (
    <FloatingPanel
      title="Order"
      placement="bottom-within"
      content={
        <Grid
          css={{
            gridTemplateColumns: "4fr 6fr",
            padding: theme.panel.padding,
          }}
          gap={2}
        >
          <PropertyLabel
            label="Order"
            description={propertyDescriptions.order}
            properties={["order"]}
          />
          <TextControl property="order" />
        </Grid>
      }
    >
      <Flex>
        <EllipsesIcon />
      </Flex>
    </FloatingPanel>
  );
};

export const OrderControl = () => {
  const order = useComputedStyleDecl("order");
  const selectedValue = toValue(order.cascadedValue);
  const items = [
    {
      child: <XSmallIcon />,
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
      child: <OrderPopover />,
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
    <Grid css={{ gridTemplateColumns: "3fr 8fr" }}>
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
            label="Order"
            code={item.code}
            description={item.description}
            properties={["order"]}
          >
            <ToggleGroupButton
              aria-checked={
                item.value === selectedValue ||
                // order takes integer value, so the value can be anything from +- 0-9
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
