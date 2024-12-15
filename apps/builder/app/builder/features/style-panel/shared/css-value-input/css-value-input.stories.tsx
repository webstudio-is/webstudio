import * as React from "react";
import { Flex, InputField } from "@webstudio-is/design-system";
import type { StyleValue } from "@webstudio-is/css-engine";
import { CssValueInput, type IntermediateStyleValue } from "./css-value-input";
import { action } from "@storybook/addon-actions";
import { toValue } from "@webstudio-is/css-engine";
import { theme } from "@webstudio-is/design-system";

export default {
  component: CssValueInput,
};

export const WithKeywords = () => {
  const [value, setValue] = React.useState<StyleValue>({
    type: "keyword",
    value: "auto",
  });

  const [intermediateValue, setIntermediateValue] = React.useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      styleSource="preset"
      property="width"
      value={value}
      intermediateValue={intermediateValue}
      getOptions={() => [
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "min-content" },
        { type: "keyword", value: "max-content" },
        { type: "keyword", value: "fit-content" },
      ]}
      onChange={(value) => {
        setIntermediateValue(value);
      }}
      onHighlight={(value) => {
        action("onHighlight")(value);
      }}
      onChangeComplete={({ value }) => {
        // on blur, select, enter etc.
        setValue(value);
        setIntermediateValue(undefined);
        action("onChangeComplete")(value);
      }}
      onAbort={() => {
        action("onAbort")();
      }}
      onReset={() => {
        action("onReset")();
      }}
    />
  );
};

export const WithIcons = () => {
  const [value, setValue] = React.useState<StyleValue>({
    type: "keyword",
    value: "space-around",
  });

  const [intermediateValue, setIntermediateValue] = React.useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      styleSource="preset"
      property="alignItems"
      value={value}
      intermediateValue={intermediateValue}
      getOptions={() => [
        { type: "keyword", value: "normal" },
        { type: "keyword", value: "start" },
        { type: "keyword", value: "end" },
        { type: "keyword", value: "center" },
        { type: "keyword", value: "stretch" },
        { type: "keyword", value: "space-around" },
        { type: "keyword", value: "space-between" },
      ]}
      onChange={(newValue) => {
        setIntermediateValue(newValue);
      }}
      onHighlight={(value) => {
        action("onHighlight")(value);
      }}
      onChangeComplete={({ value }) => {
        // on blur, select, enter etc.
        setValue(value);
        setIntermediateValue(undefined);
        action("onChangeComplete")(value);
      }}
      onAbort={() => {
        action("onAbort")();
      }}
      onReset={() => {
        action("onReset")();
      }}
    />
  );
};

export const WithUnits = () => {
  const [value, setValue] = React.useState<StyleValue>({
    type: "unit",
    value: 100,
    unit: "px",
  });

  const [intermediateValue, setIntermediateValue] = React.useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <Flex css={{ gap: theme.spacing[9] }}>
      <CssValueInput
        styleSource="preset"
        property="rowGap"
        value={value}
        intermediateValue={intermediateValue}
        getOptions={() => [
          { type: "keyword", value: "auto" },
          { type: "keyword", value: "min-content" },
          { type: "keyword", value: "max-content" },
          { type: "keyword", value: "fit-content" },
        ]}
        onChange={(newValue) => {
          setIntermediateValue(newValue);
        }}
        onHighlight={(value) => {
          action("onHighlight")(value);
        }}
        onChangeComplete={({ value }) => {
          // on blur, select, enter etc.
          setValue(value);
          setIntermediateValue(undefined);
          action("onChangeComplete")(value);
        }}
        onAbort={() => {
          action("onAbort")();
        }}
        onReset={() => {
          action("onReset")();
        }}
      />
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
    </Flex>
  );
};

export const Oversized = () => {
  const [value, setValue] = React.useState<StyleValue>({
    type: "var",
    value: "start-test-test-test-test-test-test-test-end",
  });

  const [intermediateValue, setIntermediateValue] = React.useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <Flex css={{ width: 100 }}>
      <CssValueInput
        styleSource="preset"
        property="alignItems"
        value={value}
        intermediateValue={intermediateValue}
        onChange={(newValue) => {
          setIntermediateValue(newValue);
        }}
        onHighlight={(value) => {
          action("onHighlight")(value);
        }}
        onChangeComplete={({ value }) => {
          // on blur, select, enter etc.
          setValue(value);
          setIntermediateValue(undefined);
          action("onChangeComplete")(value);
        }}
        onAbort={() => {
          action("onAbort")();
        }}
        onReset={() => {
          action("onReset")();
        }}
      />
    </Flex>
  );
};
