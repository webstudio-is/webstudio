import * as React from "react";
import { Flex, DeprecatedTextField } from "@webstudio-is/design-system";
import type {
  InvalidValue,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-engine";
import { CssValueInput, type IntermediateStyleValue } from "./css-value-input";
import { action } from "@storybook/addon-actions";
import { toValue } from "@webstudio-is/css-engine";
import { theme } from "@webstudio-is/design-system";
import { isValidDeclaration, parseCssValue } from "@webstudio-is/css-data";

export default {
  component: CssValueInput,
};

export const WithCustomValidator = () => {
  const [value, setValue] = React.useState<StyleValue>({
    type: "unit",
    value: 0,
    unit: "px",
  });

  const [intermediateValue, setIntermediateValue] = React.useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      styleSource="preset"
      property="boxShadow"
      value={value}
      intermediateValue={intermediateValue}
      keywords={[]}
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
      isValidDeclaration={(_, value) =>
        isValidDeclaration("boxShadow", `${value} 0`)
      }
      parseIntermediateOrInvalidValue={(
        _: StyleProperty,
        styleValue: IntermediateStyleValue | InvalidValue
      ): StyleValue => {
        const value = styleValue.value.trim();
        const unit = "unit" in styleValue ? styleValue.unit ?? "px" : "px";

        /* Box shaodw needs atleast two values, so we are passing custom validator */
        let styleInput = parseCssValue("boxShadow", `${value}${unit} 0`);
        if (styleInput.type !== "invalid") {
          return {
            type: "unit",
            value: parseFloat(value),
            unit,
          };
        }

        styleInput = parseCssValue("boxShadow", `${value} 0`);
        if (styleInput.type !== "invalid") {
          return {
            type: "unit",
            value: parseFloat(value),
            unit,
          };
        }

        return {
          type: "invalid",
          value,
        };
      }}
    />
  );
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
      <DeprecatedTextField
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
