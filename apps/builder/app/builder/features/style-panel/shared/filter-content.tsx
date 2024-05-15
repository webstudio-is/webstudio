import {
  type InvalidValue,
  type StyleProperty,
  type TupleValue,
  type FunctionValue,
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
import { useEffect, useState } from "react";
import {
  CssValueInputContainer,
  type IntermediateStyleValue,
} from "../shared/css-value-input";
import { parseFilter } from "@webstudio-is/css-data";
import type { DeleteProperty } from "../shared/use-style-data";
import { ShadowContent } from "./shadow-content";

const filterFunctions = {
  blur: "0px",
  brightness: "0%",
  contrast: "0%",
  "drop-shadow": "0px 2px 5px rgba(0, 0, 0, 0.2)",
  grayscale: "0%",
  "hue-rotate": "0deg",
  invert: "0%",
  opacity: "0%",
  saturate: "0%",
  sepia: "0%",
} as const;

type FilterContentProps = {
  index: number;
  property: StyleProperty;
  layer: FunctionValue;
  propertyValue: string;
  tooltip: JSX.Element;
  onEditLayer: (index: number, layers: TupleValue) => void;
  deleteProperty: DeleteProperty;
};

type FilterFunction = keyof typeof filterFunctions;

const isFilterFunction = (value: string): value is FilterFunction =>
  Object.keys(filterFunctions).includes(value);

export const FilterSectionContent = ({
  index,
  property,
  propertyValue,
  onEditLayer,
  deleteProperty,
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
    if (isFilterFunction(layer.name) === false || layer.args.type !== "tuple") {
      return;
    }

    setFilterFunction(layer.name);
    setFilterFunctionValue(layer.args.value[0]);
    setIntermediateValue({
      type: "intermediate",
      value: propertyValue,
    });
  }, [layer, propertyValue]);

  const updateFilter = (filterValue: string) => {
    const layers = parseFilter(filterValue);
    if (layers.type === "invalid") {
      return;
    }

    onEditLayer(index, layers);
  };

  const handleFilterFunctionChange = (filterName: FilterFunction) => {
    const defaultFilterValue = filterFunctions[filterName];
    setFilterFunction(filterName);
    updateFilter(`${filterName}(${defaultFilterValue})`);
  };

  const handleFilterFunctionValueChange = (value: StyleValue) => {
    setFilterFunctionValue(value);
    updateFilter(`${filterFunction}(${toValue(value)})`);
  };

  return (
    <Flex direction="column">
      <Flex direction="column" css={{ px: theme.spacing[9] }}>
        <Grid
          gap="2"
          css={{
            marginTop: theme.spacing[5],
            paddingBottom: theme.spacing[5],
            gridTemplateColumns: "1fr 3fr",
            alignItems: "center",
          }}
        >
          <Label>Function</Label>
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
              marginTop: theme.spacing[5],
              paddingBottom: theme.spacing[5],
              gridTemplateColumns: "1fr 3fr",
              alignItems: "center",
            }}
          >
            <Label>Value</Label>
            <CssValueInputContainer
              key="functionValue"
              property="outlineOffset"
              styleSource="local"
              value={
                filterFunctionValue ?? {
                  type: "unit",
                  value: 0,
                  unit: "px",
                }
              }
              keywords={[]}
              setValue={handleFilterFunctionValueChange}
              deleteProperty={deleteProperty}
            />
          </Grid>
        ) : undefined}
      </Flex>
      {/* function args are always a tuple. This is just to satisfy the type checker */}

      {filterFunction === "drop-shadow" && layer.args.type === "tuple" ? (
        <ShadowContent
          index={index}
          // text-shaodw and drop-shaodow accepts the same args so we can use the same component
          // and pass the args as value and property
          property="textShadow"
          layer={layer.args}
          tooltip={<></>}
          propertyValue={toValue(layer.args)}
          onEditLayer={(_, dropShadowLayers) => {
            updateFilter(`drop-shadow(${toValue(dropShadowLayers)})`);
          }}
          deleteProperty={() => {}}
          hideCodeEditor={true}
        />
      ) : undefined}

      <Separator css={{ gridAutoColumns: "span 2" }} />
      <Flex
        direction="column"
        css={{
          px: theme.spacing[9],
          paddingTop: theme.spacing[5],
          paddingBottom: theme.spacing[9],
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
          state={intermediateValue?.type === "invalid" ? "invalid" : undefined}
          onChange={(value) => {
            setIntermediateValue({
              type: "intermediate",
              value,
            });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && intermediateValue !== undefined) {
              updateFilter(intermediateValue.value);
              // On pressing Enter, the textarea is creating a new line.
              // In-order to prevent it and update the content.
              // We prevent the default behaviour
              event.preventDefault();
            }

            if (event.key === "Escape") {
              // @todo: Delete might delete the total code instead of just the layer
              deleteProperty(property, { isEphemeral: true });
              setIntermediateValue(undefined);
              event.preventDefault();
            }
          }}
        />
      </Flex>
    </Flex>
  );
};
