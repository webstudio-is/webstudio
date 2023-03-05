import { useState } from "react";
import {
  TupleValue,
  type StyleValue,
  type StyleProperty,
  TupleValueItem,
} from "@webstudio-is/css-data";
import {
  Flex,
  Label,
  PositionGrid,
  theme,
  Box,
  EnhancedTooltip,
} from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import { styleConfigByName } from "../../shared/configs";
import { getStyleSource, type StyleSource } from "../../shared/style-info";
import type { DeleteProperty } from "../../shared/use-style-data";

const toPosition = (value: TupleValue) => {
  return {
    left: value.value[0].value,
    top: value.value[1].value,
  };
};

type TextControlProps = {
  property: StyleProperty;
  keywords: any;
  label: string;
  styleSource: StyleSource;
  value: TupleValueItem;
  setValue: (value: StyleValue, options?: { isEphemeral: boolean }) => void;
  deleteProperty: DeleteProperty;
};

const TextControl = ({
  property,
  keywords,
  label,
  styleSource,
  value,
  setValue,
  deleteProperty,
}: TextControlProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <EnhancedTooltip content={label}>
      <Box>
        <CssValueInput
          styleSource={styleSource}
          property={property}
          value={value}
          intermediateValue={intermediateValue}
          keywords={keywords}
          onChange={(styleValue) => {
            setIntermediateValue(styleValue);

            if (styleValue === undefined) {
              deleteProperty(property, { isEphemeral: true });
              return;
            }

            if (styleValue.type !== "intermediate") {
              setValue(styleValue, { isEphemeral: true });
            }
          }}
          onHighlight={(styleValue) => {
            if (styleValue !== undefined) {
              setValue(styleValue, { isEphemeral: true });
            } else {
              deleteProperty(property, { isEphemeral: true });
            }
          }}
          onChangeComplete={({ value }) => {
            setValue(value);
            setIntermediateValue(undefined);
          }}
          onAbort={() => {
            deleteProperty(property, { isEphemeral: true });
          }}
        />
      </Box>
    </EnhancedTooltip>
  );
};

const toTuple = (valueX?: StyleValue, valueY?: StyleValue) => {
  const parsedValue = TupleValue.safeParse(valueX);
  if (parsedValue.success) {
    return parsedValue.data;
  }

  const parsedValueX = TupleValueItem.parse(valueX);
  const parsedValueY = TupleValueItem.parse(valueY);

  return {
    type: "tuple" as const,
    value: [parsedValueX, parsedValueY ?? parsedValueX],
  };
};

export const Position = ({
  currentStyle,
  property,
  setProperty,
  deleteProperty,
}: ControlProps) => {
  const { label, items } = styleConfigByName[property];
  const styleInfo = currentStyle[property];
  const value = toTuple(styleInfo?.value);
  const styleSource = getStyleSource(styleInfo);
  const keywords = items.map((item) => ({
    type: "keyword",
    value: item.name,
  }));

  const setValue = setProperty(property);

  const setValueX: TextControlProps["setValue"] = (valueX, options) => {
    const nextValue = toTuple(valueX, value.value[1]);
    setValue(nextValue, options);
  };

  const setValueY: TextControlProps["setValue"] = (valueY, options) => {
    const nextValue = toTuple(value.value[0], valueY);
    setValue(nextValue, options);
  };

  return (
    <Flex css={{ px: theme.spacing[9], py: theme.spacing[5] }}>
      <PositionGrid
        selectedPosition={toPosition(value)}
        onSelect={({ left, top }) => {
          setValue({
            type: "tuple",
            value: [
              { type: "unit", value: left, unit: "%" },
              { type: "unit", value: top, unit: "%" },
            ],
          });
        }}
      />
      <Flex direction="column">
        <Flex>
          <Label>Left</Label>
          <TextControl
            label={label}
            property={property}
            styleSource={styleSource}
            keywords={keywords}
            value={value.value[0]}
            setValue={setValueX}
            deleteProperty={deleteProperty}
          />
        </Flex>
        <Flex>
          <Label>Top</Label>
          <TextControl
            label={label}
            property={property}
            styleSource={styleSource}
            keywords={keywords}
            value={value.value[1]}
            setValue={setValueY}
            deleteProperty={deleteProperty}
          />
        </Flex>
      </Flex>
    </Flex>
  );
};
