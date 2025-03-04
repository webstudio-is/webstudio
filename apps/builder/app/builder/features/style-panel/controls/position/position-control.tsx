import {
  camelCaseProperty,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  TupleValue,
  TupleValueItem,
  type StyleValue,
  type StyleProperty,
  type CssProperty,
} from "@webstudio-is/css-engine";
import { Flex, Grid, PositionGrid } from "@webstudio-is/design-system";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { styleConfigByName } from "../../shared/configs";
import { CssValueInputContainer } from "../../shared/css-value-input";
import {
  deleteProperty,
  setProperty,
  type SetValue,
} from "../../shared/use-style-data";
import { PropertyInlineLabel } from "../../property-label";

const toPosition = (value: TupleValue) => {
  // Should never actually happen, just for TS
  if (value.value[0].type !== "unit" || value.value[1].type !== "unit") {
    return { x: 0, y: 0 };
  }

  return {
    x: value.value[0].value,
    y: value.value[1].value,
  };
};

// @todo SetValue has legacy string value support, that needs to be removed
const toTuple = (
  valueX?: StyleValue | string,
  valueY?: StyleValue | string
) => {
  const parsedValue = TupleValue.safeParse(valueX);
  if (parsedValue.success) {
    return parsedValue.data;
  }

  const parsedValueX = valueX
    ? TupleValueItem.parse(valueX)
    : ({ type: "unit", value: 0, unit: "px" } as const);
  const parsedValueY = valueY ? TupleValueItem.parse(valueY) : parsedValueX;

  return {
    type: "tuple" as const,
    value: [parsedValueX, parsedValueY],
  };
};

export const PositionControl = ({
  property,
  styleDecl,
}: {
  property: StyleProperty | CssProperty;
  styleDecl: ComputedStyleDecl;
}) => {
  const { items } = styleConfigByName(property);
  const value = toTuple(styleDecl.cascadedValue);
  const keywords = items.map((item) => ({
    type: "keyword" as const,
    value: item.name,
  }));

  const setValue = setProperty(property);

  const setValueX: SetValue = (valueX, options) => {
    const nextValue = toTuple(valueX, value.value[1]);
    setValue(nextValue, options);
  };

  const setValueY: SetValue = (valueY, options) => {
    const nextValue = toTuple(value.value[0], valueY);
    setValue(nextValue, options);
  };

  return (
    <Flex direction="column" gap="1">
      <PropertyInlineLabel
        label="Position"
        description={propertyDescriptions[camelCaseProperty(property)]}
        properties={[property]}
      />
      <Flex gap="6">
        <PositionGrid
          selectedPosition={toPosition(value)}
          onSelect={({ x, y }) => {
            setValue({
              type: "tuple",
              value: [
                { type: "unit", value: x, unit: "%" },
                { type: "unit", value: y, unit: "%" },
              ],
            });
          }}
        />
        <Grid
          css={{ gridTemplateColumns: "max-content 1fr" }}
          align="center"
          gapX="2"
        >
          <PropertyInlineLabel
            label="Left"
            description="Left position offset"
            properties={[property]}
          />
          <CssValueInputContainer
            property={property}
            styleSource={styleDecl.source.name}
            getOptions={() => keywords}
            value={value.value[0]}
            setValue={setValueX}
            deleteProperty={deleteProperty}
          />
          <PropertyInlineLabel
            label="Top"
            description="Top position offset"
            properties={[property]}
          />
          <CssValueInputContainer
            property={property}
            styleSource={styleDecl.source.name}
            getOptions={() => keywords}
            value={value.value[1]}
            setValue={setValueY}
            deleteProperty={deleteProperty}
          />
        </Grid>
      </Flex>
    </Flex>
  );
};
