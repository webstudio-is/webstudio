import * as React from "react";
import {
  Flex,
  InputField,
  SmallIconButton,
  StorySection,
  Text,
  theme,
} from "@webstudio-is/design-system";
import type { StyleValue, CssProperty } from "@webstudio-is/css-engine";
import type { StyleValueSourceColor } from "~/shared/style-object-model";
import {
  CssValueInput as CssValueInputComponent,
  type CssValueInputValue,
} from "./css-value-input";
import type { UnitOption } from "./unit-select";
import { action } from "@storybook/addon-actions";
import { toValue } from "@webstudio-is/css-engine";
import { EyeOpenIcon, Link2Icon } from "@webstudio-is/icons";

export default {
  title: "Style panel/CSS Value Input",
  component: CssValueInputComponent,
};

const CssValueInputVariant = ({
  label,
  initialValue,
  property,
  options,
  containerWidth,
  showOutput,
  styleSource = "preset",
  disabled,
  icon,
  showSuffix,
  unitOptions,
  placeholder,
  minWidth,
  prefix,
}: {
  label: string;
  initialValue: StyleValue;
  property: CssProperty;
  options?: Array<{ type: "keyword"; value: string }>;
  containerWidth?: number;
  showOutput?: boolean;
  styleSource?: StyleValueSourceColor;
  disabled?: boolean;
  icon?: React.ReactNode;
  showSuffix?: boolean;
  unitOptions?: UnitOption[];
  placeholder?: string;
  minWidth?: string;
  prefix?: React.ReactNode;
}) => {
  const [value, setValue] = React.useState<StyleValue>(initialValue);
  const [intermediateValue, setIntermediateValue] = React.useState<
    CssValueInputValue | undefined
  >();

  const input = (
    <CssValueInputComponent
      styleSource={styleSource}
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
      disabled={disabled}
      icon={icon}
      showSuffix={showSuffix}
      unitOptions={unitOptions}
      placeholder={placeholder}
      minWidth={minWidth}
      prefix={prefix}
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

const keywordOptions = [
  { type: "keyword" as const, value: "auto" },
  { type: "keyword" as const, value: "min-content" },
  { type: "keyword" as const, value: "max-content" },
  { type: "keyword" as const, value: "fit-content" },
];

export const CSSValueInput = () => (
  <>
    <StorySection title="Keywords and units">
      <Flex
        direction="column"
        gap="5"
        css={{ maxWidth: theme.sizes.sidebarWidth }}
      >
        <CssValueInputVariant
          label="Keywords (width)"
          initialValue={{ type: "keyword", value: "auto" }}
          property="width"
          options={keywordOptions}
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
          options={keywordOptions}
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
        <CssValueInputVariant
          label="With text prefix"
          initialValue={{ type: "unit", value: 10, unit: "px" }}
          property="row-gap"
          prefix={<Text>X</Text>}
        />
        <CssValueInputVariant
          label="With placeholder"
          initialValue={{ type: "keyword", value: "" }}
          property="width"
          placeholder="Enter value\u2026"
          options={keywordOptions}
        />
        <CssValueInputVariant
          label="Only px and %"
          initialValue={{ type: "unit", value: 100, unit: "px" }}
          property="width"
          unitOptions={[
            { id: "px", label: "px", type: "unit" },
            { id: "%", label: "%", type: "unit" },
          ]}
        />
        <CssValueInputVariant
          label="Units with keyword option"
          initialValue={{ type: "unit", value: 2, unit: "rem" }}
          property="width"
          unitOptions={[
            { id: "px", label: "px", type: "unit" },
            { id: "rem", label: "rem", type: "unit" },
            { id: "auto", label: "auto", type: "keyword" },
          ]}
        />
      </Flex>
    </StorySection>

    <StorySection title="Style sources">
      <Flex
        direction="column"
        gap="5"
        css={{ maxWidth: theme.sizes.sidebarWidth }}
      >
        <CssValueInputVariant
          label="Default"
          styleSource="default"
          initialValue={{ type: "keyword", value: "auto" }}
          property="width"
          options={keywordOptions}
        />
        <CssValueInputVariant
          label="Preset"
          styleSource="preset"
          initialValue={{ type: "keyword", value: "auto" }}
          property="width"
          options={keywordOptions}
        />
        <CssValueInputVariant
          label="Local"
          styleSource="local"
          initialValue={{ type: "keyword", value: "auto" }}
          property="width"
          options={keywordOptions}
        />
        <CssValueInputVariant
          label="Remote"
          styleSource="remote"
          initialValue={{ type: "keyword", value: "auto" }}
          property="width"
          options={keywordOptions}
        />
        <CssValueInputVariant
          label="Overwritten"
          styleSource="overwritten"
          initialValue={{ type: "keyword", value: "auto" }}
          property="width"
          options={keywordOptions}
        />
      </Flex>
    </StorySection>

    <StorySection title="Disabled">
      <Flex
        direction="column"
        gap="5"
        css={{ maxWidth: theme.sizes.sidebarWidth }}
      >
        <CssValueInputVariant
          label="Disabled with keyword"
          initialValue={{ type: "keyword", value: "auto" }}
          property="width"
          disabled
          options={keywordOptions}
        />
        <CssValueInputVariant
          label="Disabled with unit"
          initialValue={{ type: "unit", value: 42, unit: "px" }}
          property="row-gap"
          disabled
        />
      </Flex>
    </StorySection>

    <StorySection title="With icon">
      <Flex
        direction="column"
        gap="5"
        css={{ maxWidth: theme.sizes.sidebarWidth }}
      >
        <CssValueInputVariant
          label="With eye icon"
          initialValue={{ type: "unit", value: 100, unit: "px" }}
          property="width"
          icon={<SmallIconButton icon={<EyeOpenIcon />} />}
        />
        <CssValueInputVariant
          label="With link icon"
          initialValue={{ type: "unit", value: 16, unit: "px" }}
          property="row-gap"
          icon={<SmallIconButton icon={<Link2Icon />} />}
        />
      </Flex>
    </StorySection>

    <StorySection title="Hidden suffix">
      <Flex
        direction="column"
        gap="5"
        css={{ maxWidth: theme.sizes.sidebarWidth }}
      >
        <CssValueInputVariant
          label="Suffix shown (default)"
          initialValue={{ type: "unit", value: 16, unit: "px" }}
          property="row-gap"
          showSuffix
        />
        <CssValueInputVariant
          label="Suffix hidden"
          initialValue={{ type: "unit", value: 16, unit: "px" }}
          property="row-gap"
          showSuffix={false}
        />
      </Flex>
    </StorySection>

    <StorySection title="Value types">
      <Flex
        direction="column"
        gap="5"
        css={{ maxWidth: theme.sizes.sidebarWidth }}
      >
        <CssValueInputVariant
          label="Keyword value"
          initialValue={{ type: "keyword", value: "auto" }}
          property="width"
          options={keywordOptions}
        />
        <CssValueInputVariant
          label="Unit value (px)"
          initialValue={{ type: "unit", value: 100, unit: "px" }}
          property="width"
        />
        <CssValueInputVariant
          label="Unit value (rem)"
          initialValue={{ type: "unit", value: 2, unit: "rem" }}
          property="width"
        />
        <CssValueInputVariant
          label="Unit value (%)"
          initialValue={{ type: "unit", value: 50, unit: "%" }}
          property="width"
        />
        <CssValueInputVariant
          label="Var value"
          initialValue={{ type: "var", value: "my-custom-var" }}
          property="width"
        />
        <CssValueInputVariant
          label="Var with fallback"
          initialValue={{
            type: "var",
            value: "brand-color",
            fallback: { type: "keyword", value: "red" },
          }}
          property="color"
        />
        <CssValueInputVariant
          label="Invalid value"
          initialValue={{ type: "invalid", value: "not-a-valid-value" }}
          property="width"
        />
        <CssValueInputVariant
          label="Unparsed value"
          initialValue={{
            type: "unparsed",
            value: "calc(100% - 20px)",
          }}
          property="width"
        />
      </Flex>
    </StorySection>

    <StorySection title="Min width">
      <Flex
        direction="column"
        gap="5"
        css={{ maxWidth: theme.sizes.sidebarWidth }}
      >
        <CssValueInputVariant
          label="Default min width"
          initialValue={{ type: "unit", value: 0, unit: "px" }}
          property="width"
        />
        <CssValueInputVariant
          label="Min width 120px"
          initialValue={{ type: "unit", value: 0, unit: "px" }}
          property="width"
          minWidth="120px"
        />
      </Flex>
    </StorySection>
  </>
);
