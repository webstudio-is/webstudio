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
  extractBoxShadowProperties,
  parseBoxShadow,
  type ExtractedBoxShadowProperties,
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
  InformationIcon,
  ShadowInsetIcon,
  ShadowNormalIcon,
} from "@webstudio-is/icons";
import { useMemo, useState } from "react";
import type { IntermediateStyleValue } from "../../shared/css-value-input";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { toPascalCase } from "../../shared/keyword-utils";
import { ColorControl } from "../../controls";
import type { SetProperty } from "../../shared/use-style-data";

type BoxShadowContentProps = {
  index: number;
  layer: TupleValue;
  shadow: string;
  onEditLayer: (index: number, layers: LayersValue) => void;
};

const convertValuesToTupple = (
  values: Record<keyof ExtractedBoxShadowProperties, StyleValue | null>
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
}: BoxShadowContentProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >();
  const layerValues = useMemo<ExtractedBoxShadowProperties>(() => {
    setIntermediateValue({ type: "intermediate", value: shadow });
    return extractBoxShadowProperties(layer);
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
    const layers = parseBoxShadow(intermediateValue.value);
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
    params: Partial<Record<keyof ExtractedBoxShadowProperties, StyleValue>>
  ) => {
    const newLayer = convertValuesToTupple(Object.assign(layerValues, params));
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
          <Label css={{ display: "inline" }}>X</Label>
          <CssValueInputContainer
            key="boxShadowOffsetX"
            property="borderTopWidth"
            label="Offset X"
            styleSource="local"
            keywords={[]}
            value={offsetX ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value) => handlePropertyChange({ offsetX: value })}
            deleteProperty={() => {}}
          />
        </Flex>

        <Flex direction="column">
          <Label css={{ display: "inline" }}>Blur</Label>
          <CssValueInputContainer
            key="boxShadowBlur"
            property="borderTopWidth"
            label="BoxShadow Blur"
            styleSource="local"
            keywords={[]}
            value={blur ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value) => handlePropertyChange({ blur: value })}
            deleteProperty={() => {}}
          />
        </Flex>

        <Flex direction="column">
          <Label css={{ display: "inline" }}>Y</Label>
          <CssValueInputContainer
            key="boxShadowOffsetY"
            property="borderTopWidth"
            label="Offset Y"
            styleSource="local"
            keywords={[]}
            value={offsetY ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value) => handlePropertyChange({ offsetY: value })}
            deleteProperty={() => {}}
          />
        </Flex>

        <Flex direction="column">
          <Label css={{ display: "inline" }}>Spread</Label>
          <CssValueInputContainer
            key="boxShadowSpread"
            property="borderTopWidth"
            label="BoxShadow Spread"
            styleSource="local"
            keywords={[]}
            value={spread ?? { type: "unit", value: 0, unit: "px" }}
            setValue={(value) => handlePropertyChange({ spread: value })}
            deleteProperty={() => {}}
          />
        </Flex>
      </Grid>

      <Grid
        gap="2"
        css={{
          px: theme.spacing[9],
          marginTop: theme.spacing[5],
          paddingBottom: theme.spacing[5],
          gridTemplateColumns: "2fr 1fr",
        }}
      >
        <Flex direction="column">
          <Label css={{ display: "inline" }}>Color</Label>
          <ColorControl
            property="color"
            currentStyle={{
              color: {
                value: colorControlProp,
                currentColor: colorControlProp,
              },
            }}
            setProperty={colorControlCallback}
            deleteProperty={() => {}}
          />
        </Flex>

        <Flex direction="column" align="center">
          <Label css={{ display: "inline" }}>Inset</Label>
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
                  Paste a box-shadow value, for example:
                  <br />
                  <br />
                  0px 2px 5px 0px rgba(0, 0, 0, 0.2)
                </Text>
              }
            >
              <InformationIcon />
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
          }}
        />
      </Flex>
    </Flex>
  );
};
