import { Grid, Select, theme } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { styleConfigByName } from "../../shared/configs";
import { toPascalCase } from "../../shared/keyword-utils";
import { parseCssValue } from "@webstudio-is/css-data";
import type { ControlProps } from "../../style-sections";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import {
  type StyleValue,
  TupleValue,
  TupleValueItem,
} from "@webstudio-is/css-data";
import type { SetValue } from "../../shared/use-style-data";
import { NonResetablePropertyName } from "../../shared/property-name";

const StyleKeywordAuto = { type: "keyword" as const, value: "auto" };

const toTuple = (
  valueX?: StyleValue | string,
  valueY?: StyleValue | string
) => {
  const parsedValue = TupleValue.safeParse(valueX);
  if (parsedValue.success) {
    return parsedValue.data;
  }

  const parsedValueX = valueX ? TupleValueItem.parse(valueX) : StyleKeywordAuto;
  const parsedValueY = valueY ? TupleValueItem.parse(valueY) : parsedValueX;

  return {
    type: "tuple" as const,
    value: [parsedValueX, parsedValueY],
  };
};

export const BackgroundSize = (
  props: Omit<ControlProps, "property" | "items">
) => {
  const property = "backgroundSize";

  const styleInfo = props.currentStyle[property];
  const styleValue = styleInfo?.value;
  const styleSource = "default";
  const { items: defaultItems } = styleConfigByName(property);

  const selectOptions = [
    ...defaultItems,
    { name: "custom", label: "Custom" },
  ].map(({ name }) => name);
  const selectValue =
    styleValue?.type === "keyword" ? toValue(styleValue) : "custom";

  const customSizeDisabled = styleValue?.type === "keyword";
  const customSizeOptions = [StyleKeywordAuto];
  const customSizeValue = toTuple(styleValue);

  const setValue = props.setProperty(property);

  const setValueX: SetValue = (valueX, options) => {
    const nextValue = toTuple(valueX, customSizeValue.value[1]);
    setValue(nextValue, options);
  };

  const setValueY: SetValue = (valueY, options) => {
    const nextValue = toTuple(customSizeValue.value[0], valueY);
    setValue(nextValue, options);
  };

  return (
    <>
      <Grid
        css={{ gridTemplateColumns: `1fr ${theme.spacing[23]}` }}
        align="center"
        gap={2}
      >
        <NonResetablePropertyName
          style={props.currentStyle}
          properties={[property]}
          label="Size"
        />

        <Select
          // show empty field instead of radix placeholder
          // like css value input does
          placeholder=""
          options={selectOptions}
          getLabel={toPascalCase}
          value={selectValue}
          onChange={(name) => {
            if (name === "custom") {
              setValue({
                type: "tuple",
                value: [StyleKeywordAuto, StyleKeywordAuto],
              });
            } else {
              const cssValue = parseCssValue(property, name);
              setValue(cssValue);
            }
          }}
        />
      </Grid>

      <Grid
        css={{ mt: theme.spacing[4] }}
        align="center"
        columns={2}
        gapX={2}
        gapY={1}
      >
        <NonResetablePropertyName
          style={props.currentStyle}
          properties={[property]}
          label="Width"
          description="The width of the background image."
          disabled={customSizeDisabled}
        />

        <NonResetablePropertyName
          style={props.currentStyle}
          properties={[property]}
          label="Height"
          description="The height of the background image."
          disabled={customSizeDisabled}
        />

        <CssValueInputContainer
          disabled={customSizeDisabled}
          label={"Width"}
          property={property}
          styleSource={styleSource}
          keywords={customSizeOptions}
          value={customSizeValue.value[0]}
          setValue={setValueX}
          deleteProperty={props.deleteProperty}
        />

        <CssValueInputContainer
          disabled={customSizeDisabled}
          label={"Height"}
          property={property}
          styleSource={styleSource}
          keywords={customSizeOptions}
          value={customSizeValue.value[1]}
          setValue={setValueY}
          deleteProperty={props.deleteProperty}
        />
      </Grid>
    </>
  );
};
