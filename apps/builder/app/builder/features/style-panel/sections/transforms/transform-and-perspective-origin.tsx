import { propertyDescriptions, propertySyntaxes } from "@webstudio-is/css-data";
import type { SectionProps } from "../shared/section";
import { Flex, Grid, theme, PositionGrid } from "@webstudio-is/design-system";
import {
  KeywordValue,
  StyleValue,
  TupleValue,
  UnitValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { styleConfigByName } from "../../shared/configs";
import { useMemo } from "react";
import { extractTransformOrPerspectiveOriginValues } from "./transform-extractors";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { calculatePositionFromOrigin } from "./transform-utils";
import { PropertyInlineLabel, PropertyLabel } from "../../property-label";

// Fake properties to use in the CssValueInputContainer
// x, y axis takes length | percentage | keyword
// z axis takes length
const fakePropertyX: StyleProperty = "backgroundPositionX";
const fakePropertyY: StyleProperty = "backgroundPositionY";
const fakePropertyZ: StyleProperty = "outlineOffset";

export const TransformAndPerspectiveOrigin = (
  props: SectionProps & { property: StyleProperty }
) => {
  const { currentStyle, setProperty, property } = props;
  const value = currentStyle[property]?.local;
  const { label } = styleConfigByName(property);
  const origin = useMemo(() => {
    if (value?.type !== "tuple" && value?.type !== "keyword") {
      return;
    }

    return extractTransformOrPerspectiveOriginValues(value);
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

  if (origin === undefined) {
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

    if (property === "transformOrigin" && origin.z !== undefined) {
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
      <PropertyLabel
        label={label}
        description={
          propertyDescriptions[property as keyof typeof propertyDescriptions]
        }
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
                  property === "transformOrigin" ? "X Offset" : "X Position"
                }
                description={
                  property === "transformOrigin"
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
                  property === "transformOrigin" ? "Y Offset" : "Y Position"
                }
                description={
                  property === "transformOrigin"
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
            {property === "transformOrigin" && origin.z !== undefined && (
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
    </Flex>
  );
};
