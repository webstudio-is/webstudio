import { useEffect, useState } from "react";
import {
  toValue,
  type ShadowValue,
  type InvalidValue,
  type LayersValue,
  type StyleValue,
  type VarValue,
  type CssProperty,
  type RgbValue,
} from "@webstudio-is/css-engine";
import {
  keywordValues,
  parseCssValue,
  propertySyntaxes,
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
import { humanizeString } from "~/shared/string-utils";
import { PropertyInlineLabel } from "../property-label";
import type { IntermediateStyleValue } from "./css-value-input";
import { CssValueInputContainer } from "./css-value-input";
import type { StyleUpdateOptions } from "./use-style-data";
import {
  CssFragmentEditor,
  CssFragmentEditorContent,
  parseCssFragment,
} from "./css-fragment";
import { ColorPicker } from "./color-picker";
import { $availableColorVariables, $availableUnitVariables } from "./model";

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

const defaultColor: RgbValue = {
  type: "rgb",
  r: 0,
  g: 0,
  b: 0,
  alpha: 1,
};

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
  const parsedShadowProperty: CssProperty =
    property === "drop-shadow" ? "text-shadow" : property;
  // try to reparse computed value
  // which can contain parsable value after variables substitution
  if (computedLayer?.type === "unparsed") {
    const styleValue = parseCssValue(parsedShadowProperty, computedLayer.value);
    if (styleValue.type === "layers") {
      [computedLayer] = styleValue.value;
    }
  }
  let shadowValue: ShadowValue = {
    type: "shadow",
    position: "outset",
    offsetX: { type: "unit", value: 0, unit: "px" },
    offsetY: { type: "unit", value: 0, unit: "px" },
  };
  if (layer.type === "shadow") {
    shadowValue = layer;
  }
  if (layer.type === "var" && computedLayer?.type === "shadow") {
    shadowValue = computedLayer;
  }
  if (layer.type === "unparsed" && computedLayer?.type === "shadow") {
    shadowValue = computedLayer;
  }
  const computedShadow =
    computedLayer?.type === "shadow" ? computedLayer : shadowValue;

  const disabledControls = layer.type === "var" || layer.type === "unparsed";

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
    // prevent reparsing value from string when not changed
    // because it may contain css variables
    // which cannot be safely parsed into ShadowValue
    if (intermediateValue.value === propertyValue) {
      return;
    }
    // dropShadow is a function under the filter property.
    // To parse the value correctly, we need to change the property to textShadow.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow#formal_syntax
    // https://developer.mozilla.org/en-US/docs/Web/CSS/text-shadow#formal_syntax
    // Both share a similar syntax but the property name is different.
    const parsed = parseCssFragment(intermediateValue.value, [
      parsedShadowProperty,
    ]);
    const parsedValue = parsed.get(parsedShadowProperty);
    if (parsedValue?.type === "layers" || parsedValue?.type === "var") {
      onEditLayer(index, parsedValue, { isEphemeral: false });
      return;
    }
    setIntermediateValue({
      type: "invalid",
      value: intermediateValue.value,
    });
  };

  const updateShadow = (
    params: Partial<ShadowValue>,
    options: StyleUpdateOptions = { isEphemeral: false }
  ) => {
    const newLayer: ShadowValue = { ...shadowValue, ...params };
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
            // outline-offset is a fake property for validating box-shadow's offsetX.
            property="outline-offset"
            styleSource="local"
            aria-disabled={disabledControls}
            getOptions={() => $availableUnitVariables.get()}
            value={shadowValue.offsetX}
            onUpdate={(value, options) => {
              if (value.type === "unit" || value.type === "var") {
                updateShadow({ offsetX: value }, options);
              }
            }}
            onDelete={(options) =>
              updateShadow({ offsetX: shadowValue.offsetX }, options)
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
            // outline-offset is a fake property for validating box-shadow's offsetY.
            property="outline-offset"
            styleSource="local"
            aria-disabled={disabledControls}
            getOptions={() => $availableUnitVariables.get()}
            value={shadowValue.offsetY}
            onUpdate={(value, options) => {
              if (value.type === "unit" || value.type === "var") {
                updateShadow({ offsetY: value }, options);
              }
            }}
            onDelete={(options) =>
              updateShadow({ offsetY: shadowValue.offsetY }, options)
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
            // border-top-width is a fake property for validating box-shadow's blur.
            property="border-top-width"
            styleSource="local"
            aria-disabled={disabledControls}
            getOptions={() => $availableUnitVariables.get()}
            value={shadowValue.blur ?? { type: "unit", value: 0, unit: "px" }}
            onUpdate={(value, options) => {
              if (value.type === "unit" || value.type === "var") {
                updateShadow({ blur: value }, options);
              }
            }}
            onDelete={(options) =>
              updateShadow({ blur: shadowValue.blur }, options)
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
              // outline-offset is a fake property for validating box-shadow's spread.
              property="outline-offset"
              styleSource="local"
              aria-disabled={disabledControls}
              getOptions={() => $availableUnitVariables.get()}
              value={
                shadowValue.spread ?? { type: "unit", value: 0, unit: "px" }
              }
              onUpdate={(value, options) => {
                if (value.type === "unit" || value.type === "var") {
                  updateShadow({ spread: value }, options);
                }
              }}
              onDelete={(options) =>
                updateShadow({ spread: shadowValue.spread }, options)
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
            aria-disabled={disabledControls}
            value={shadowValue.color ?? defaultColor}
            currentColor={computedShadow?.color ?? defaultColor}
            getOptions={() => [
              ...(keywordValues.color ?? []).map((item) => ({
                type: "keyword" as const,
                value: item,
              })),
              ...$availableColorVariables.get(),
            ]}
            onChange={(value) => {
              if (value.type === "rgb" || value.type === "var") {
                updateShadow({ color: value }, { isEphemeral: true });
              }
            }}
            onChangeComplete={(value) => {
              if (value.type === "rgb" || value.type === "var") {
                updateShadow({ color: value });
              }
            }}
            onAbort={() => updateShadow({ color: shadowValue.color })}
            onReset={() => updateShadow({ color: undefined })}
          />
        </Flex>

        {property === "box-shadow" ? (
          <Flex direction="column" gap="1">
            <PropertyInlineLabel
              label={humanizeString(shadowValue.position)}
              description={shadowPropertySyntaxes["box-shadow"].position}
            />
            <ToggleGroup
              type="single"
              aria-disabled={disabledControls}
              value={shadowValue.position}
              defaultValue="inset"
              onValueChange={(value) =>
                updateShadow({ position: value as ShadowValue["position"] })
              }
            >
              <Tooltip content="Outset">
                <ToggleGroupButton value="outset">
                  <ShadowNormalIcon />
                </ToggleGroupButton>
              </Tooltip>
              <Tooltip content="Inset">
                <ToggleGroupButton value="inset">
                  <ShadowInsetIcon />
                </ToggleGroupButton>
              </Tooltip>
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
                  autoFocus={disabledControls}
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
