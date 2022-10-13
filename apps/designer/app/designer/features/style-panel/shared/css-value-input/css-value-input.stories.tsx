import React from "react";
import { Flex, TextField } from "@webstudio-is/design-system";
import { StyleValue } from "@webstudio-is/react-sdk";
import { CssValueInput } from "./css-value-input";
import { action } from "@storybook/addon-actions";

export default {
  component: CssValueInput,
};

export const WithKeywords = () => {
  const [value, setValue] = React.useState<StyleValue>({
    type: "keyword",
    value: "auto",
  });

  return (
    <CssValueInput
      property="width"
      value={value}
      keywords={[
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "min-content" },
        { type: "keyword", value: "max-content" },
        { type: "keyword", value: "fit-content" },
      ]}
      onChange={(value) => {
        setValue(value);
      }}
      onChangeComplete={(newValue) => {
        // on blur, select, enter etc.
        setValue(newValue);
        action("onChangeComplete")(newValue);
      }}
      onItemHighlight={(value) => {
        action("onItemHighlight")(value);
      }}
    />
  );
};

export const WithIcons = () => {
  const [value, setValue] = React.useState<StyleValue>({
    type: "keyword",
    value: "space-around",
  });

  return (
    <CssValueInput
      property="alignItems"
      value={value}
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
        setValue(newValue);
      }}
      onChangeComplete={(newValue) => {
        // on blur, select, enter etc.
        setValue(newValue);
        action("onChangeComplete")(newValue);
      }}
      onItemHighlight={(value) => {
        action("onItemHighlight")(value);
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

  return (
    <Flex css={{ gap: "$3" }}>
      <CssValueInput
        property="rowGap"
        value={value}
        keywords={[
          { type: "keyword", value: "auto" },
          { type: "keyword", value: "min-content" },
          { type: "keyword", value: "max-content" },
          { type: "keyword", value: "fit-content" },
        ]}
        onChange={(newValue) => {
          setValue(newValue);
        }}
        onChangeComplete={(newValue) => {
          // on blur, select, enter etc.
          setValue(newValue);
          action("onChangeComplete")(newValue);
        }}
        onItemHighlight={(value) => {
          action("onItemHighlight")(value);
        }}
      />
      <TextField
        readOnly
        value={
          value
            ? value?.type === "unit"
              ? value.value + value.unit
              : value.value
            : ""
        }
      />
    </Flex>
  );
};
