import {
  type InvalidValue,
  type StyleProperty,
  type TupleValue,
  type FunctionValue,
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
import { useMemo, useState } from "react";
import {
  CssValueInputContainer,
  type IntermediateStyleValue,
} from "../shared/css-value-input";
import { parseFilter } from "@webstudio-is/css-data";
import type { DeleteProperty } from "../shared/use-style-data";
import { filterFunctions } from "../sections/filter/filter-utils";

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

  const parsedFilterValue = useMemo<
    | {
        name: FilterFunction;
        value: TupleValue;
      }
    | undefined
  >(() => {
    setIntermediateValue({ type: "intermediate", value: propertyValue });
    if (isFilterFunction(layer.name) === true && layer.args.type === "tuple") {
      return {
        name: layer.name,
        value: layer.args,
      };
    }

    return;
  }, [layer, propertyValue]);

  const handleChange = (value: string) => {
    setIntermediateValue({
      type: "intermediate",
      value,
    });
  };

  const handleComplete = () => {
    if (intermediateValue === undefined) {
      return;
    }

    const layers = parseFilter(intermediateValue.value);
    if (layers.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }

    onEditLayer(index, layers);
  };

  const handleFilterFunctionChange = (value: FilterFunction) => {
    console.log(value);
  };

  return (
    <Flex direction="column">
      {/* Invalid filter property */}
      {parsedFilterValue !== undefined ? (
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
              options={Object.keys(filterFunctions) as FilterFunction[]}
              value={parsedFilterValue.name}
              onChange={handleFilterFunctionChange}
            />
          </Grid>
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
                parsedFilterValue.value.value?.[0] ?? {
                  type: "unit",
                  value: 0,
                  unit: "px",
                }
              }
              keywords={[]}
              setValue={(value) => console.log(`setValue`, value)}
              deleteProperty={() => console.log(`deleteProperty`)}
            />
          </Grid>
        </Flex>
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
        {
          // @todo Replace the TextArea with code-editor.
          // For more details, please refer to the issue
          // https://github.com/webstudio-is/webstudio/issues/2977
        }
        <TextArea
          rows={3}
          name="description"
          value={intermediateValue?.value ?? propertyValue ?? ""}
          css={{ minHeight: theme.spacing[14], ...textVariants.mono }}
          state={intermediateValue?.type === "invalid" ? "invalid" : undefined}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleComplete();
              // On pressing Enter, the textarea is creating a new line.
              // In-order to prevent it and update the content.
              // We prevent the default behaviour
              event.preventDefault();
            }

            if (event.key === "Escape") {
              if (intermediateValue === undefined) {
                return;
              }

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
