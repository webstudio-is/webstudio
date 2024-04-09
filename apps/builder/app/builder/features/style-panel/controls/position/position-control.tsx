import {
  TupleValue,
  type StyleValue,
  TupleValueItem,
} from "@webstudio-is/css-engine";
import { Flex, Grid, PositionGrid } from "@webstudio-is/design-system";
import type { ControlProps } from "../types";
import { styleConfigByName } from "../../shared/configs";
import { getStyleSource } from "../../shared/style-info";
import { CssValueInputContainer } from "./css-value-input-container";
import type { SetValue } from "../../shared/use-style-data";
import { NonResetablePropertyName } from "../../shared/property-name";

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
  currentStyle,
  property,
  setProperty,
  deleteProperty,
  isAdvanced,
}: ControlProps) => {
  const { label, items } = styleConfigByName(property);
  const styleInfo = currentStyle[property];
  const value = toTuple(styleInfo?.value);
  const styleSource = getStyleSource(styleInfo);
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
      <NonResetablePropertyName
        style={currentStyle}
        properties={[property]}
        label="Position"
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
          css={{
            gridTemplateColumns: "max-content 1fr",
          }}
          align="center"
          gapX="2"
        >
          <NonResetablePropertyName
            style={currentStyle}
            properties={[property]}
            description="Left position offset"
            label="Left"
          />

          <CssValueInputContainer
            label={label}
            property={property}
            styleSource={styleSource}
            keywords={keywords}
            value={value.value[0]}
            setValue={setValueX}
            deleteProperty={deleteProperty}
            disabled={isAdvanced}
          />

          <NonResetablePropertyName
            style={currentStyle}
            properties={[property]}
            description="Top position offset"
            label="Top"
          />

          <CssValueInputContainer
            label={label}
            property={property}
            styleSource={styleSource}
            keywords={keywords}
            value={value.value[1]}
            setValue={setValueY}
            deleteProperty={deleteProperty}
            disabled={isAdvanced}
          />
        </Grid>
      </Flex>
    </Flex>
  );
};
