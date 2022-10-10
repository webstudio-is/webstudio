import React from "react";
import { Flex, TextField } from "@webstudio-is/design-system";
import { StyleValue } from "@webstudio-is/react-sdk";
import { CssValueInput } from "./css-property";

export default {
  component: CssValueInput,
};

export const WithKeywords = () => {
  const [value, setValue] = React.useState<StyleValue | undefined>({
    type: "keyword",
    value: "auto",
  });

  return (
    <CssValueInput
      property="width"
      value={value}
      allowedValues={[
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "min-content" },
        { type: "keyword", value: "max-content" },
        { type: "keyword", value: "fit-content" },
      ]}
      onChange={(value) => {
        // every time we change the input
        // eslint-disable-next-line no-console
        console.log(value);
      }}
      onChangeComplete={(newValue) => {
        // on blur, select, enter etc.
        setValue(newValue);
      }}
    />
  );
};

export const WithIcons = () => {
  const [value, setValue] = React.useState<StyleValue | undefined>({
    type: "keyword",
    value: "space-around",
  });

  return (
    <CssValueInput
      property="alignItems"
      value={value}
      allowedValues={[
        { type: "keyword", value: "normal" },
        { type: "keyword", value: "start" },
        { type: "keyword", value: "end" },
        { type: "keyword", value: "center" },
        { type: "keyword", value: "stretch" },
        { type: "keyword", value: "space-around" },
        { type: "keyword", value: "space-between" },
      ]}
      onChange={(newValue) => {
        // every time we change the input with units
        if (newValue?.type === "unit") {
          setValue(newValue);
        }
      }}
      onChangeComplete={(newValue) => {
        // on blur, select, enter etc.
        setValue(newValue);
      }}
    />
  );
};

export const WithUnits = () => {
  const [value, setValue] = React.useState<StyleValue | undefined>({
    type: "unit",
    value: 100,
    unit: "px",
  });

  return (
    <Flex css={{ gap: "$3" }}>
      <CssValueInput
        property="rowGap"
        value={value}
        allowedValues={[
          { type: "keyword", value: "auto" },
          { type: "keyword", value: "min-content" },
          { type: "keyword", value: "max-content" },
          { type: "keyword", value: "fit-content" },
        ]}
        onChange={(newValue) => {
          // every time we change the input with units
          if (newValue === undefined || newValue?.type === "unit") {
            setValue(newValue);
          }
        }}
        onChangeComplete={(newValue) => {
          // on blur, select, enter etc.
          setValue(newValue);
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
