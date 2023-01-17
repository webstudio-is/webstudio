import * as React from "react";
import { Flex, TextField } from "@webstudio-is/design-system";
import type { StyleValue } from "@webstudio-is/css-data";
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
      keywords={[
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
      keywords={[
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
        keywords={[
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
      />
      <TextField
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
