import type { SectionProps } from "../shared/section";
import {
  Label,
  Flex,
  Grid,
  theme,
  PositionGrid,
} from "@webstudio-is/design-system";
import {
  KeywordValue,
  StyleValue,
  TupleValue,
  UnitValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";
import { useMemo } from "react";
import { extractTransformOrPerspectiveOriginValues } from "./transform-extractors";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";

const property: StyleProperty = "transformOrigin";

// Fake properties to use in the CssValueInputContainer
// x, y axis takes length | percentage | keyword
// z axis takes length
const fakePropertyX: StyleProperty = "backgroundPositionX";
const fakePropertyY: StyleProperty = "backgroundPositionY";
const fakePropertyZ: StyleProperty = "outlineOffset";

const keyworkToValue: Record<string, number> = {
  left: 0,
  right: 100,
  center: 50,
  top: 0,
  bottom: 100,
};

const calculateBackgroundPosition = (value: StyleValue | undefined) => {
  if (value === undefined) {
    return 50;
  }

  if (value.type === "unit") {
    return value.value;
  }

  if (value.type === "keyword") {
    return keyworkToValue[value.value];
  }

  return 0;
};

export const TransformOrigin = (props: SectionProps) => {
  const { currentStyle, deleteProperty, setProperty } = props;
  const value = currentStyle[property]?.local;
  const { label } = styleConfigByName(property);
  const origin = useMemo(() => {
    if (value?.type !== "tuple") {
      return;
    }

    return extractTransformOrPerspectiveOriginValues(value);
  }, [value]);

  const xInfo = useMemo(() => calculateBackgroundPosition(origin?.x), [origin]);
  const yInfo = useMemo(() => calculateBackgroundPosition(origin?.y), [origin]);
  const xOriginKeywords: Array<KeywordValue> = ["left", "center", "right"].map(
    (value) => ({
      type: "keyword",
      value,
    })
  );
  const yOriginKeywords: Array<KeywordValue> = ["top", "center", "bottom"].map(
    (value) => ({
      type: "keyword",
      value,
    })
  );

  if (value?.type !== "tuple" || origin === undefined) {
    return;
  }

  const handleValueChange = (
    index: number,
    value: StyleValue,
    options?: StyleUpdateOptions
  ) => {
    if (value.type === "invalid") {
      return;
    }

    let newValue: UnitValue | KeywordValue | undefined;

    if (
      value.type === "layers" &&
      (value.value[0].type === "unit" || value.value[0].type === "keyword")
    ) {
      newValue = value.value[0];
    }

    if (value.type === "unit" || value.type === "keyword") {
      newValue = value;
    }

    if (newValue === undefined) {
      return;
    }

    const newTupleValue: TupleValue = {
      type: "tuple",
      value: [origin.x, origin.y],
    };

    if (origin.z !== undefined) {
      newTupleValue.value.push(origin.z);
    }

    newTupleValue.value.splice(index, 1, newValue);
    setProperty(property)(newTupleValue, options);
  };

  const handlePositionGridChange = (position: { x: number; y: number }) => {
    const value: TupleValue = {
      type: "tuple",
      value: [
        {
          type: "unit",
          value: position.x,
          unit: "%",
        },
        {
          type: "unit",
          value: position.y,
          unit: "%",
        },
      ],
    };

    if (origin.z !== undefined) {
      value.value.push(origin.z);
    }

    setProperty(property)(value, { isEphemeral: false });
  };

  return (
    <Flex
      direction="column"
      gap="2"
      css={{
        px: theme.spacing[9],
      }}
    >
      <PropertyName
        label={label}
        properties={[property]}
        style={currentStyle}
        onReset={() => deleteProperty(property)}
      />
      <Flex gap="6">
        <Grid css={{ gridTemplateColumns: "1fr 1fr" }} align="center" gapX="2">
          <PositionGrid
            selectedPosition={{ x: xInfo, y: yInfo }}
            onSelect={handlePositionGridChange}
          />
          <Flex gap="2" direction="column">
            <Flex gap="2" align="center">
              <Label>X</Label>
              <CssValueInputContainer
                value={origin.x}
                keywords={xOriginKeywords}
                styleSource="local"
                property={fakePropertyX}
                deleteProperty={() => {}}
                setValue={(value, options) =>
                  handleValueChange(0, value, options)
                }
              />
            </Flex>
            <Flex gap="2" align="center">
              <Label>Y</Label>
              <CssValueInputContainer
                value={origin.y}
                keywords={yOriginKeywords}
                styleSource="local"
                property={fakePropertyY}
                deleteProperty={() => {}}
                setValue={(value, options) =>
                  handleValueChange(1, value, options)
                }
              />
            </Flex>
            {origin.z !== undefined && (
              <Flex gap="2" align="center">
                <Label>Z</Label>
                <CssValueInputContainer
                  value={origin.z}
                  keywords={[]}
                  styleSource="local"
                  property={fakePropertyZ}
                  deleteProperty={() => {}}
                  setValue={(value, options) =>
                    handleValueChange(2, value, options)
                  }
                />
              </Flex>
            )}
          </Flex>
        </Grid>
      </Flex>
    </Flex>
  );
};
