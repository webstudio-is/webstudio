import { camelCase } from "change-case";
import {
  type InvalidValue,
  type TupleValue,
  toValue,
  StyleValue,
} from "@webstudio-is/css-engine";
import {
  Flex,
  theme,
  Label,
  TextArea,
  textVariants,
  Separator,
  Select,
  Grid,
} from "@webstudio-is/design-system";
import { useEffect, useState, type JSX } from "react";
import {
  CssValueInputContainer,
  type IntermediateStyleValue,
} from "../shared/css-value-input";
import { parseCssValue } from "@webstudio-is/css-data";
import type { StyleUpdateOptions } from "../shared/use-style-data";
import { ShadowContent } from "./shadow-content";
import { parseCssFragment } from "./css-fragment";

// filters can't be validated directly in the css-engine. Because, these are not properties
// but functions that proeprties accept. So, we need to validate them manually using fake proeprties
// which accepts the same values as the filter functions. This is a bit hacky but it works.
//
// https://developer.mozilla.org/en-US/docs/Web/CSS/opacity#syntax
// number  | percentage
//
// https://developer.mozilla.org/en-US/docs/Web/CSS/outline-offset#syntax
// length
// https://developer.mozilla.org/en-US/docs/Web/CSS/rotate#formal_syntax
// angle

const filterFunctions = {
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/blur#syntax
  // length
  blur: { default: "0px", fakeProperty: "outlineOffset" },
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/brightness#formal_syntax
  // number | percentage
  brightness: { default: "0%", fakeProperty: "opacity" },
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/contrast#formal_syntax
  // number  | percentage
  contrast: { default: "0%", fakeProperty: "opacity" },
  // text-shaodw and drop-shaodow accepts the same args so we can use the same component
  // and pass the args as value and property
  "drop-shadow": {
    default: "0px 2px 5px rgba(0, 0, 0, 0.2)",
    fakeProperty: "textShadow",
  },
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/grayscale#syntax
  // number  | percentage
  grayscale: { default: "0%", fakeProperty: "opacity" },
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/hue-rotate#syntax
  // angle
  "hue-rotate": { default: "0deg", fakeProperty: "rotate" },
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/invert#syntax
  // number  | percentage
  invert: { default: "0%", fakeProperty: "opacity" },
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/opacity#syntax
  // number  | percentage
  opacity: { default: "0%", fakeProperty: "opacity" },
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/saturate#syntax
  // number | percentage
  saturate: { default: "0%", fakeProperty: "opacity" },
  // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/sepia#parameters
  // number | percentage
  sepia: { default: "0%", fakeProperty: "opacity" },
} as const;

type FilterContentProps = {
  index: number;
  property: "filter" | "backdrop-filter";
  layer: StyleValue;
  propertyValue: string;
  tooltip: JSX.Element;
  onEditLayer: (
    index: number,
    layers: TupleValue,
    options: StyleUpdateOptions
  ) => void;
};

type FilterFunction = keyof typeof filterFunctions;

const isFilterFunction = (value: string): value is FilterFunction =>
  Object.keys(filterFunctions).includes(value);

export const FilterSectionContent = ({
  index,
  property,
  propertyValue,
  onEditLayer,
  tooltip,
  layer,
}: FilterContentProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >();
  const [filterFunction, setFilterFunction] = useState<
    FilterFunction | undefined
  >(undefined);
  const [filterFunctionValue, setFilterFunctionValue] = useState<
    StyleValue | undefined
  >(undefined);

  useEffect(() => {
    if (
      layer.type !== "function" ||
      isFilterFunction(layer.name) === false ||
      layer.args.type !== "tuple"
    ) {
      return;
    }

    setFilterFunction(layer.name);
    setFilterFunctionValue(layer.args.value[0]);
    setIntermediateValue({
      type: "intermediate",
      value: propertyValue,
    });
  }, [layer, propertyValue]);

  const handleFilterFunctionChange = (filterName: FilterFunction) => {
    const defaultFilterValue = filterFunctions[filterName];
    setFilterFunction(filterName);
    const functionValue = parseCssValue(
      defaultFilterValue.fakeProperty,
      defaultFilterValue.default
    );

    setFilterFunctionValue(functionValue);
    handleComplete(`${filterName}(${toValue(functionValue)})`);
  };

  const handleFilterFunctionValueChange = (
    value: StyleValue,
    options: StyleUpdateOptions = { isEphemeral: false }
  ) => {
    setFilterFunctionValue(value);
    handleComplete(`${filterFunction}(${toValue(value)})`, options);
  };

  const handleComplete = (
    value: string,
    options: StyleUpdateOptions = { isEphemeral: false }
  ) => {
    const parsed = parseCssFragment(value, [camelCase(property)]);
    const parsedValue = parsed.get(property);
    const invalid = parsedValue === undefined || parsedValue.type === "invalid";
    setIntermediateValue({
      type: invalid ? "invalid" : "intermediate",
      value,
    });
    if (parsedValue?.type === "tuple") {
      onEditLayer(index, parsedValue, options);
    }
  };

  return (
    <Flex direction="column">
      <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
        <Grid
          gap="2"
          css={{
            gridTemplateColumns: "1fr 3fr",
            alignItems: "center",
          }}
        >
          <Flex align="center">
            <Label>Function</Label>
          </Flex>
          <Select
            name="filterFunction"
            placeholder="Select Filter"
            options={Object.keys(filterFunctions) as FilterFunction[]}
            value={filterFunction ?? "blur"}
            onChange={handleFilterFunctionChange}
          />
        </Grid>
        {filterFunction !== "drop-shadow" ? (
          <Grid
            gap="2"
            css={{
              gridTemplateColumns: "1fr 3fr",
              alignItems: "center",
            }}
          >
            <Flex align="center">
              <Label>Value</Label>
            </Flex>
            <CssValueInputContainer
              key="functionValue"
              property={
                filterFunction
                  ? filterFunctions[filterFunction].fakeProperty
                  : "outlineOffset"
              }
              styleSource="local"
              value={
                filterFunctionValue ?? {
                  type: "unit",
                  value: 0,
                  unit: "px",
                }
              }
              setValue={handleFilterFunctionValueChange}
              deleteProperty={() => {}}
            />
          </Grid>
        ) : undefined}
      </Flex>

      {filterFunction === "drop-shadow" &&
      layer.type === "function" &&
      layer.args.type === "tuple" ? (
        <ShadowContent
          index={index}
          property="drop-shadow"
          layer={layer.args}
          propertyValue={toValue(layer.args)}
          onEditLayer={(_, dropShadowLayers, options) => {
            handleComplete(
              `drop-shadow(${toValue(dropShadowLayers)})`,
              options
            );
          }}
          hideCodeEditor={true}
        />
      ) : undefined}

      <Separator css={{ gridAutoColumns: "span 2" }} />
      <Flex
        direction="column"
        css={{
          padding: theme.panel.padding,
          gap: theme.spacing[3],
          minWidth: theme.spacing[30],
        }}
      >
        <Label>
          <Flex align={"center"} gap={1}>
            Code
            {tooltip}
          </Flex>
        </Label>
        <TextArea
          rows={3}
          name="description"
          value={intermediateValue?.value ?? ""}
          css={{ minHeight: theme.spacing[14], ...textVariants.mono }}
          color={intermediateValue?.type === "invalid" ? "error" : undefined}
          onChange={(value) =>
            setIntermediateValue({ type: "intermediate", value })
          }
          onBlur={() => {
            if (intermediateValue !== undefined) {
              handleComplete(intermediateValue.value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && intermediateValue !== undefined) {
              handleComplete(intermediateValue.value);
              // On pressing Enter, the textarea is creating a new line.
              // In-order to prevent it and update the content.
              // We prevent the default behaviour
              event.preventDefault();
            }
          }}
        />
      </Flex>
    </Flex>
  );
};
