import { useEffect, useMemo, useState } from "react";
import {
  toValue,
  type InvalidValue,
  type LayersValue,
  type RgbValue,
  type StyleValue,
  type TupleValue,
  type UnitValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import {
  extractShadowProperties,
  propertySyntaxes,
  type ExtractedShadowProperties,
} from "@webstudio-is/css-data";
import {
  Flex,
  Grid,
  Label,
  Separator,
  Text,
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
import type { IntermediateStyleValue } from "../shared/css-value-input";
import { CssValueInputContainer } from "../shared/css-value-input";
import { toPascalCase } from "../shared/keyword-utils";
import type { StyleUpdateOptions } from "../shared/use-style-data";
import {
  CssFragmentEditor,
  CssFragmentEditorContent,
  parseCssFragment,
} from "./css-fragment";
import { PropertyInlineLabel } from "../property-label";
import { styleConfigByName } from "./configs";
import { ColorPicker } from "./color-picker";

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

type ShadowContentProps = {
  index: number;
  property: "box-shadow" | "text-shadow" | "drop-shadow";
  layer: StyleValue;
  computedLayer?: StyleValue;
  propertyValue: string;
  onEditLayer: (
    index: number,
    layers: LayersValue | VarValue,
    options: StyleUpdateOptions
  ) => void;
  hideCodeEditor?: boolean;
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

const shadowPropertySyntaxes = {
  "box-shadow": {
    x: propertySyntaxes.boxShadowOffsetX,
    y: propertySyntaxes.boxShadowOffsetY,
    blur: propertySyntaxes.boxShadowBlurRadius,
    spread: propertySyntaxes.boxShadowSpreadRadius,
    color: propertySyntaxes.boxShadowColor,
    position: propertySyntaxes.boxShadowPosition,
  },
  "text-shadow": {
    x: propertySyntaxes.textShadowOffsetX,
    y: propertySyntaxes.textShadowOffsetY,
    blur: propertySyntaxes.textShadowBlurRadius,
    color: propertySyntaxes.textShadowColor,
  },
  "drop-shadow": {
    x: propertySyntaxes.dropShadowOffsetX,
    y: propertySyntaxes.dropShadowOffsetY,
    blur: propertySyntaxes.dropShadowBlurRadius,
    color: propertySyntaxes.dropShadowColor,
  },
} as const;

export const ShadowContent = ({
  layer,
  computedLayer,
  index,
  property,
  propertyValue,
  hideCodeEditor = false,
  onEditLayer,
}: ShadowContentProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >({ type: "intermediate", value: propertyValue });
  useEffect(() => {
    setIntermediateValue({ type: "intermediate", value: propertyValue });
  }, [propertyValue]);
  const layerValues = useMemo<ExtractedShadowProperties>(() => {
    let value: TupleValue = { type: "tuple", value: [] };
    if (layer.type === "tuple") {
      value = layer;
    }
    if (layer.type === "var" && computedLayer?.type === "tuple") {
      value = computedLayer;
    }
    return extractShadowProperties(value);
  }, [layer, computedLayer]);

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
    // dropShadow is a function under the filter property.
    // To parse the value correctly, we need to change the property to textShadow.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow#formal_syntax
    // https://developer.mozilla.org/en-US/docs/Web/CSS/text-shadow#formal_syntax
    // Both share a similar syntax but the property name is different.
    const parsed = parseCssFragment(intermediateValue.value, [
      property === "drop-shadow" ? "text-shadow" : property,
    ]);
    const parsedValue = parsed.get(
      property === "drop-shadow" ? "text-shadow" : property
    );
    if (parsedValue?.type === "layers" || parsedValue?.type === "var") {
      onEditLayer(index, parsedValue, { isEphemeral: false });
      return;
    }
    setIntermediateValue({
      type: "invalid",
      value: intermediateValue.value,
    });
  };

  const handlePropertyChange = (
    params: Partial<Record<keyof ExtractedShadowProperties, StyleValue>>,
    options: StyleUpdateOptions = { isEphemeral: false }
  ) => {
    const newLayer = convertValuesToTupple({ ...layerValues, ...params });
    setIntermediateValue({
      type: "intermediate",
      value: toValue(newLayer),
    });
    onEditLayer(index, { type: "layers", value: [newLayer] }, options);
  };

  return (
    <Flex direction="column">
      <Grid
        gap="2"
        css={{
          padding: theme.panel.padding,
          gridTemplateColumns:
            property === "box-shadow" ? "1fr 1fr" : "1fr 1fr 1fr",
        }}
      >
        <Flex direction="column" gap="1">
          <PropertyInlineLabel
            label="X"
            title="Offset X"
            description={shadowPropertySyntaxes[property].x}
          />
          <CssValueInputContainer
            key="boxShadowOffsetX"
            // outline-offset is a fake property for validating box-shadow's offsetX.
            property="outlineOffset"
            styleSource="local"
            disabled={layer.type === "var"}
            value={offsetX ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value, options) =>
              handlePropertyChange({ offsetX: value }, options)
            }
            deleteProperty={() =>
              handlePropertyChange({
                offsetX: offsetX ?? undefined,
              })
            }
          />
        </Flex>

        <Flex direction="column" gap="1">
          <PropertyInlineLabel
            label="Y"
            title="Offset Y"
            description={shadowPropertySyntaxes[property].y}
          />
          <CssValueInputContainer
            key="boxShadowOffsetY"
            // outline-offset is a fake property for validating box-shadow's offsetY.
            property="outlineOffset"
            styleSource="local"
            disabled={layer.type === "var"}
            value={offsetY ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value, options) =>
              handlePropertyChange({ offsetY: value }, options)
            }
            deleteProperty={() =>
              handlePropertyChange({
                offsetY: offsetY ?? undefined,
              })
            }
          />
        </Flex>

        <Flex direction="column" gap="1">
          <PropertyInlineLabel
            label="Blur"
            title="Blur Radius"
            description={shadowPropertySyntaxes[property].blur}
          />
          <CssValueInputContainer
            key="boxShadowBlur"
            // border-top-width is a fake property for validating box-shadow's blur.
            property="borderTopWidth"
            styleSource="local"
            disabled={layer.type === "var"}
            value={blur ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value, options) =>
              handlePropertyChange({ blur: value }, options)
            }
            deleteProperty={() =>
              handlePropertyChange({
                blur: blur ?? undefined,
              })
            }
          />
        </Flex>

        {property === "box-shadow" ? (
          <Flex direction="column" gap="1">
            <PropertyInlineLabel
              label="Spread"
              title="Spread Radius"
              description={shadowPropertySyntaxes["box-shadow"].spread}
            />
            <CssValueInputContainer
              key="boxShadowSpread"
              // outline-offset is a fake property for validating box-shadow's spread.
              property="outlineOffset"
              styleSource="local"
              disabled={layer.type === "var"}
              value={spread ?? { type: "unit", value: 0, unit: "px" }}
              setValue={(value, options) =>
                handlePropertyChange({ spread: value }, options)
              }
              deleteProperty={() =>
                handlePropertyChange({
                  spread: spread ?? undefined,
                })
              }
            />
          </Flex>
        ) : null}
      </Grid>

      <Grid
        gap="2"
        css={{
          padding: theme.panel.padding,
          ...(property === "box-shadow" && { gridTemplateColumns: "3fr 1fr" }),
        }}
      >
        <Flex direction="column" gap="1">
          <PropertyInlineLabel
            label="Color"
            description={shadowPropertySyntaxes[property].color}
          />
          <ColorPicker
            property="color"
            disabled={layer.type === "var"}
            value={colorControlProp}
            currentColor={colorControlProp}
            getOptions={() =>
              styleConfigByName("color").items.map((item) => ({
                type: "keyword",
                value: item.name,
              }))
            }
            onChange={(styleValue) =>
              handlePropertyChange({ color: styleValue }, { isEphemeral: true })
            }
            onChangeComplete={(styleValue) =>
              handlePropertyChange({ color: styleValue })
            }
            onAbort={() => handlePropertyChange({ color: colorControlProp })}
            onReset={() => {
              handlePropertyChange({ color: undefined });
            }}
          />
        </Flex>

        {property === "box-shadow" ? (
          <Flex direction="column" gap="1">
            <PropertyInlineLabel
              label="Inset"
              description={shadowPropertySyntaxes["box-shadow"].position}
            />
            <ToggleGroup
              type="single"
              disabled={layer.type === "var"}
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
        ) : null}
      </Grid>

      {hideCodeEditor === false ? (
        <>
          <Separator css={{ gridColumn: "span 2" }} />
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
                <Tooltip
                  variant="wrapped"
                  content={
                    <Text>
                      Paste a {property} CSS code without the property name, for
                      example:
                      <br /> <br />
                      <Text variant="monoBold">
                        0px 2px 5px 0px rgba(0, 0, 0, 0.2)
                      </Text>
                    </Text>
                  }
                >
                  <InfoCircleIcon />
                </Tooltip>
              </Flex>
            </Label>
            <CssFragmentEditor
              content={
                <CssFragmentEditorContent
                  invalid={intermediateValue?.type === "invalid"}
                  autoFocus={layer.type === "var"}
                  value={intermediateValue?.value ?? propertyValue ?? ""}
                  onChange={handleChange}
                  onChangeComplete={handleComplete}
                />
              }
            />
          </Flex>
        </>
      ) : undefined}
    </Flex>
  );
};
