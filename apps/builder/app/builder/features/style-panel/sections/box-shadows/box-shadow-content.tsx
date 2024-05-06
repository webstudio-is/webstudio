import {
  toValue,
  type InvalidValue,
  type LayersValue,
  type RgbValue,
  type StyleValue,
  type TupleValue,
  type UnitValue,
} from "@webstudio-is/css-engine";
import {
  extractShadowProperties,
  parseShadow,
  type ExtractedShadowProperties,
} from "@webstudio-is/css-data";
import {
  Flex,
  Grid,
  Label,
  Separator,
  Text,
  TextArea,
  textVariants,
  theme,
  ToggleGroup,
  ToggleGroupButton,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  InfoCircleIcon,
  ShadowInsetIcon,
  ShadowNormalIcon,
} from "@webstudio-is/icons";
import { useMemo, useState } from "react";
import type { IntermediateStyleValue } from "../../shared/css-value-input";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { toPascalCase } from "../../shared/keyword-utils";
import { ColorControl } from "../../controls";
import type { DeleteProperty, SetProperty } from "../../shared/use-style-data";

/*
  When it comes to checking and validating individual CSS properties for the box-shadow,
  splitting them fails the validation. As it needs a minimum of 2 values to validate.
  Instead, a workaround is to use a fallback CSS property
  that can handle the same values as the input being validated.

  Here's the box-shadow property with its components:

  box-shadow: color, inset, offsetX, offsetY, blur, spread;
  You can check more details from the spec
  https://www.w3.org/TR/css-backgrounds-3/#box-shadow

  offsetX: length, takes positive and negative values.
  offsetY: length, takes positive and negative values.
  blur: length, takes only positive values.
  spread: length, takes both positive and negative values.

  outline-offset: length, takes positive and negative values.
  https://www.w3.org/TR/css-ui-4/#outline-offset

  border-top-width: length, takes only positive values.
  https://www.w3.org/TR/css-backgrounds-3/#propdef-border-top-width
*/

type BoxShadowContentProps = {
  index: number;
  layer: TupleValue;
  shadow: string;
  onEditLayer: (index: number, layers: LayersValue) => void;
  deleteProperty: DeleteProperty;
};

const convertValuesToTupple = (
  values: Partial<Record<keyof ExtractedShadowProperties, StyleValue>>
): TupleValue => {
  return {
    type: "tuple",
    value: (Object.values(values) as Array<StyleValue>).filter(
      (item: StyleValue): item is UnitValue | RgbValue =>
        item !== null && item !== undefined
    ),
  };
};

const boxShadowInsetValues = [
  { value: "normal", Icon: ShadowNormalIcon },
  { value: "inset", Icon: ShadowInsetIcon },
] as const;

export const BoxShadowContent = ({
  layer,
  index,
  shadow,
  onEditLayer,
  deleteProperty,
}: BoxShadowContentProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >();
  const layerValues = useMemo<ExtractedShadowProperties>(() => {
    setIntermediateValue({ type: "intermediate", value: shadow });
    return extractShadowProperties(layer);
  }, [layer, shadow]);
  const { offsetX, offsetY, blur, spread, color, inset } = layerValues;
  const colorControlProp = color ?? {
    type: "rgb",
    r: 0,
    g: 0,
    b: 0,
    alpha: 1,
  };

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
    const layers = parseShadow("boxShadow", intermediateValue.value);
    if (layers.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }

    onEditLayer(index, layers);
  };

  const handlePropertyChange = (
    params: Partial<Record<keyof ExtractedShadowProperties, StyleValue>>
  ) => {
    const newLayer = convertValuesToTupple({ ...layerValues, ...params });
    setIntermediateValue({
      type: "intermediate",
      value: toValue(newLayer),
    });
    onEditLayer(index, { type: "layers", value: [newLayer] });
  };

  const colorControlCallback: SetProperty = () => {
    return (value) => {
      handlePropertyChange({ color: value });
    };
  };

  return (
    <Flex direction="column">
      <Grid
        columns={2}
        gap="2"
        css={{
          paddingTop: theme.spacing[5],
          px: theme.spacing[9],
        }}
      >
        <Flex direction="column">
          <Tooltip
            content={
              <Flex gap="2" direction="column">
                <Text variant="regularBold">X Offset</Text>
                <Text variant="monoBold">offset-x</Text>
                <Text>
                  Sets the horizontal offset of the
                  <br />
                  shadow. Negative values place
                  <br />
                  the shadow to the left.
                </Text>
              </Flex>
            }
          >
            <Label css={{ width: "fit-content" }}>X</Label>
          </Tooltip>
          <CssValueInputContainer
            key="boxShadowOffsetX"
            /*
              outline-offset is a fake property for validating box-shadow's offsetX.
            */
            property="outlineOffset"
            styleSource="local"
            keywords={[]}
            value={offsetX ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value) => handlePropertyChange({ offsetX: value })}
            deleteProperty={() =>
              handlePropertyChange({
                offsetX: offsetX ?? undefined,
              })
            }
          />
        </Flex>

        <Flex direction="column">
          <Tooltip
            content={
              <Flex gap="2" direction="column">
                <Text variant="regularBold">Blur Radius</Text>
                <Text variant="monoBold">blur-radius</Text>
                <Text>
                  The larger this value, the bigger
                  <br />
                  the blur, so the shadow becomes
                  <br />
                  bigger and lighter.
                </Text>
              </Flex>
            }
          >
            <Label css={{ width: "fit-content" }}>Blur</Label>
          </Tooltip>
          <CssValueInputContainer
            key="boxShadowBlur"
            /*
              border-top-width is a fake property for validating box-shadow's blur.
            */
            property="borderTopWidth"
            styleSource="local"
            keywords={[]}
            value={blur ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value) => handlePropertyChange({ blur: value })}
            deleteProperty={() =>
              handlePropertyChange({
                blur: blur ?? undefined,
              })
            }
          />
        </Flex>

        <Flex direction="column">
          <Tooltip
            content={
              <Flex gap="2" direction="column">
                <Text variant="regularBold">Y Offset</Text>
                <Text variant="monoBold">offset-y</Text>
                <Text>
                  Sets the vertical offset of the
                  <br />
                  shadow. Negative values place
                  <br />
                  the shadow above.
                </Text>
              </Flex>
            }
          >
            <Label css={{ width: "fit-content" }}>Y</Label>
          </Tooltip>
          <CssValueInputContainer
            key="boxShadowOffsetY"
            /*
              outline-offset is a fake property for validating box-shadow's offsetY.
            */
            property="outlineOffset"
            styleSource="local"
            keywords={[]}
            value={offsetY ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value) => handlePropertyChange({ offsetY: value })}
            deleteProperty={() =>
              handlePropertyChange({
                offsetY: offsetY ?? undefined,
              })
            }
          />
        </Flex>

        <Flex direction="column">
          <Tooltip
            content={
              <Flex gap="2" direction="column">
                <Text variant="regularBold">Spread Radius</Text>
                <Text variant="monoBold">spread-radius</Text>
                <Text>
                  Positive values will cause the
                  <br />
                  shadow to expand and grow
                  <br />
                  bigger, negative values will cause
                  <br />
                  the shadow to shrink.
                </Text>
              </Flex>
            }
          >
            <Label css={{ width: "fit-content" }}>Spread</Label>
          </Tooltip>
          <CssValueInputContainer
            key="boxShadowSpread"
            /*
              outline-offset is a fake property for validating box-shadow's spread.
            */
            property="outlineOffset"
            styleSource="local"
            keywords={[]}
            value={spread ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value) => handlePropertyChange({ spread: value })}
            deleteProperty={() =>
              handlePropertyChange({
                spread: spread ?? undefined,
              })
            }
          />
        </Flex>
      </Grid>

      <Grid
        gap="2"
        css={{
          px: theme.spacing[9],
          marginTop: theme.spacing[5],
          paddingBottom: theme.spacing[5],
          gridTemplateColumns: "3fr 1fr",
        }}
      >
        <Flex direction="column">
          <Tooltip
            content={
              <Flex gap="2" direction="column">
                <Text variant="regularBold">Color</Text>
                <Text variant="monoBold">color</Text>
                <Text>
                  Sets the shadow color and
                  <br />
                  opacity.
                </Text>
              </Flex>
            }
          >
            <Label css={{ width: "fit-content" }}>Color</Label>
          </Tooltip>
          <ColorControl
            property="color"
            currentStyle={{
              color: {
                value: colorControlProp,
                currentColor: colorControlProp,
              },
            }}
            setProperty={colorControlCallback}
            deleteProperty={() =>
              handlePropertyChange({ color: colorControlProp })
            }
          />
        </Flex>

        <Flex direction="column">
          <Tooltip
            content={
              <Flex gap="2" direction="column">
                <Text variant="regularBold">Inset</Text>
                <Text variant="monoBold">inset</Text>
                <Text>
                  Changes the shadow from
                  <br />
                  an outer shadow (outset) to an
                  <br />
                  inner shadow (inset).
                </Text>
              </Flex>
            }
          >
            <Label css={{ display: "inline" }}>Inset</Label>
          </Tooltip>
          <ToggleGroup
            type="single"
            value={inset?.value ?? "normal"}
            defaultValue="inset"
            onValueChange={(value) => {
              if (value === "inset") {
                handlePropertyChange({
                  inset: { type: "keyword", value: "inset" },
                });
              } else {
                handlePropertyChange({ inset: undefined });
              }
            }}
          >
            {boxShadowInsetValues.map(({ value, Icon }) => (
              <Tooltip key={value} content={toPascalCase(value)}>
                <ToggleGroupButton value={value}>
                  <Icon />
                </ToggleGroupButton>
              </Tooltip>
            ))}
          </ToggleGroup>
        </Flex>
      </Grid>

      <Separator css={{ gridColumn: "span 2" }} />
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
            <Tooltip
              variant="wrapped"
              content={
                <Text>
                  Paste a box-shadow CSS code
                  <br />
                  without the property name, for
                  <br />
                  example:
                  <br />
                  <br />
                  0px 2px 5px 0px rgba(0, 0, 0, 0.2)
                </Text>
              }
            >
              <InfoCircleIcon />
            </Tooltip>
          </Flex>
        </Label>
        <TextArea
          rows={3}
          name="description"
          value={intermediateValue?.value ?? shadow ?? ""}
          css={{ minHeight: theme.spacing[14], ...textVariants.mono }}
          state={intermediateValue?.type === "invalid" ? "invalid" : undefined}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleComplete();
              event.preventDefault();
            }

            if (event.key === "Escape") {
              if (intermediateValue === undefined) {
                return;
              }

              deleteProperty("boxShadow", { isEphemeral: true });
              setIntermediateValue(undefined);
              event.preventDefault();
            }
          }}
        />
      </Flex>
    </Flex>
  );
};
