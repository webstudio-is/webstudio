import * as React from "react";
import { Flex, InputField, Text, theme } from "@webstudio-is/design-system";
import type { StyleValue, CssProperty } from "@webstudio-is/css-engine";
import { CssValueInput, type IntermediateStyleValue } from "./css-value-input";
import { action } from "@storybook/addon-actions";
import { toValue } from "@webstudio-is/css-engine";

export default {
  title: "Style Panel/CSS Value Input",
  component: CssValueInput,
};

const CssValueInputVariant = ({
  label,
  initialValue,
  property,
  options,
  containerWidth,
  showOutput,
}: {
  label: string;
  initialValue: StyleValue;
  property: CssProperty;
  options?: Array<{ type: "keyword"; value: string }>;
  containerWidth?: number;
  showOutput?: boolean;
}) => {
  const [value, setValue] = React.useState<StyleValue>(initialValue);
  const [intermediateValue, setIntermediateValue] = React.useState<
    StyleValue | IntermediateStyleValue
  >();

  const input = (
    <CssValueInput
      styleSource="preset"
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      getOptions={options ? () => options : undefined}
      onChange={setIntermediateValue}
      onHighlight={(v) => action("onHighlight")(v)}
      onChangeComplete={({ value: v }) => {
        setValue(v);
        setIntermediateValue(undefined);
        action("onChangeComplete")(v);
      }}
      onAbort={() => action("onAbort")()}
      onReset={() => action("onReset")()}
    />
  );

  return (
    <Flex direction="column" gap="1">
      <Text variant="labels">{label}</Text>
      {containerWidth ? (
        <Flex css={{ width: containerWidth }}>
          {input}
          {showOutput && (
            <InputField
              readOnly
              value={
                value
                  ? intermediateValue?.type === "intermediate"
                    ? intermediateValue.value + intermediateValue.unit
                    : toValue(value)
                  : ""
              }
            />
          )}
        </Flex>
      ) : (
        input
      )}
    </Flex>
  );
};

export const CSSValueInput = () => (
  <Flex direction="column" gap="5" css={{ maxWidth: theme.sizes.sidebarWidth }}>
    <CssValueInputVariant
      label="Keywords (width)"
      initialValue={{ type: "keyword", value: "auto" }}
      property="width"
      options={[
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "min-content" },
        { type: "keyword", value: "max-content" },
        { type: "keyword", value: "fit-content" },
      ]}
    />
    <CssValueInputVariant
      label="Icons (align-items)"
      initialValue={{ type: "keyword", value: "space-around" }}
      property="align-items"
      options={[
        { type: "keyword", value: "normal" },
        { type: "keyword", value: "start" },
        { type: "keyword", value: "end" },
        { type: "keyword", value: "center" },
        { type: "keyword", value: "stretch" },
        { type: "keyword", value: "space-around" },
        { type: "keyword", value: "space-between" },
      ]}
    />
    <CssValueInputVariant
      label="Units (row-gap)"
      initialValue={{ type: "unit", value: 100, unit: "px" }}
      property="row-gap"
      options={[
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "min-content" },
        { type: "keyword", value: "max-content" },
        { type: "keyword", value: "fit-content" },
      ]}
      showOutput
    />
    <CssValueInputVariant
      label="Oversized (100px container)"
      initialValue={{
        type: "var",
        value: "start-test-test-test-test-test-test-test-end",
      }}
      property="align-items"
      containerWidth={100}
    />
  </Flex>
);
