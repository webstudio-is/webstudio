import {
  camelCaseProperty,
  propertyDescriptions,
  propertySyntaxes,
} from "@webstudio-is/css-data";
import { Flex, Grid, PositionGrid } from "@webstudio-is/design-system";
import {
  KeywordValue,
  StyleValue,
  TupleValue,
  UnitValue,
  type CssProperty,
} from "@webstudio-is/css-engine";
import { styleConfigByName } from "../../shared/configs";
import { useMemo } from "react";
import { extractTransformOrPerspectiveOriginValues } from "./transform-extractors";
import { CssValueInputContainer } from "../../shared/css-value-input";
import {
  setProperty,
  type StyleUpdateOptions,
} from "../../shared/use-style-data";
import { PropertyInlineLabel, PropertyLabel } from "../../property-label";
import { useComputedStyleDecl } from "../../shared/model";

// Fake properties to use in the CssValueInputContainer
// x, y axis takes length | percentage | keyword
// z axis takes length
const fakePropertyX: CssProperty = "background-position-x";
const fakePropertyY: CssProperty = "background-position-y";
const fakePropertyZ: CssProperty = "outline-offset";

const keywordToValue: Record<string, number> = {
  left: 0,
  right: 100,
  center: 50,
  top: 0,
  bottom: 100,
};

export const calculatePositionFromOrigin = (value: StyleValue | undefined) => {
  if (value === undefined) {
    return 50;
  }

  if (value.type === "unit") {
    return value.value;
  }

  if (value.type === "keyword") {
    return keywordToValue[value.value];
  }

  return 0;
};

export const TransformAndPerspectiveOrigin = ({
  property,
}: {
  property: CssProperty;
}) => {
  const styleDecl = useComputedStyleDecl(property);
  const value = styleDecl.cascadedValue;
  const { label } = styleConfigByName(property);
  const origin = useMemo((): {
    x: KeywordValue | UnitValue;
    y: KeywordValue | UnitValue;
    z?: UnitValue;
  } => {
    if (value.type === "tuple" || value.type === "keyword") {
      return extractTransformOrPerspectiveOriginValues(value);
    }
    return {
      x: { type: "unit", value: 50, unit: "%" },
      y: { type: "unit", value: 50, unit: "%" },
    };
  }, [value]);

  const xInfo = useMemo(() => calculatePositionFromOrigin(origin?.x), [origin]);
  const yInfo = useMemo(() => calculatePositionFromOrigin(origin?.y), [origin]);
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

    if (property === "transform-origin" && origin.z !== undefined) {
      value.value.push(origin.z);
    }

    setProperty(property)(value, { isEphemeral: false });
  };

  return (
    <Grid gap="2">
      <PropertyLabel
        label={label}
        description={propertyDescriptions[camelCaseProperty(property)]}
        properties={[property]}
      />
      <Flex gap="6">
        <Grid css={{ gridTemplateColumns: "1fr 2fr" }} align="center" gapX="2">
          <PositionGrid
            selectedPosition={{ x: xInfo, y: yInfo }}
            onSelect={handlePositionGridChange}
          />
          <Flex gap="2" direction="column">
            <Grid
              gap="2"
              align="center"
              css={{ gridTemplateColumns: "auto 1fr" }}
            >
              <PropertyInlineLabel
                label="X"
                title={
                  property === "transform-origin" ? "X Offset" : "X Position"
                }
                description={
                  property === "transform-origin"
                    ? propertySyntaxes.transformOriginY
                    : propertySyntaxes.perspectiveOriginX
                }
              />
              <CssValueInputContainer
                value={origin.x}
                getOptions={() => xOriginKeywords}
                styleSource="local"
                property={fakePropertyX}
                deleteProperty={() => {}}
                setValue={(value, options) =>
                  handleValueChange(0, value, options)
                }
              />
            </Grid>
            <Grid
              gap="2"
              align="center"
              css={{ gridTemplateColumns: "auto 1fr" }}
            >
              <PropertyInlineLabel
                label="Y"
                title={
                  property === "transform-origin" ? "Y Offset" : "Y Position"
                }
                description={
                  property === "transform-origin"
                    ? propertySyntaxes.transformOriginY
                    : propertySyntaxes.perspectiveOriginY
                }
              />
              <CssValueInputContainer
                value={origin.y}
                getOptions={() => yOriginKeywords}
                styleSource="local"
                property={fakePropertyY}
                deleteProperty={() => {}}
                setValue={(value, options) =>
                  handleValueChange(1, value, options)
                }
              />
            </Grid>
            {property === "transform-origin" && origin.z !== undefined && (
              <Grid
                gap="2"
                align="center"
                css={{ gridTemplateColumns: "auto 1fr" }}
              >
                <PropertyInlineLabel
                  label="Z"
                  title="Z Offset"
                  description={propertySyntaxes.transformOriginZ}
                />
                <CssValueInputContainer
                  value={origin.z}
                  styleSource="local"
                  property={fakePropertyZ}
                  deleteProperty={() => {}}
                  setValue={(value, options) =>
                    handleValueChange(2, value, options)
                  }
                />
              </Grid>
            )}
          </Flex>
        </Grid>
      </Flex>
    </Grid>
  );
};
