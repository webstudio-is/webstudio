import type {
  CssProperty,
  KeywordValue,
  StyleValue,
  VarValue,
} from "@webstudio-is/css-engine";
import { propertyDescriptions } from "@webstudio-is/css-data";
import { Flex, Grid, PositionGrid } from "@webstudio-is/design-system";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { PropertyInlineLabel, PropertyLabel } from "../../property-label";
import { useComputedStyles } from "../../shared/model";
import {
  getRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";
import type { UnitOption } from "../../shared/css-value-input/unit-select";
import type { SetValue, StyleUpdateOptions } from "../../shared/use-style-data";

const keyworkToValue: Record<string, number> = {
  left: 0,
  right: 100,
  center: 50,
  top: 0,
  bottom: 100,
};

export const calculateBackgroundPosition = (value: undefined | StyleValue) => {
  if (value?.type === "unit") {
    return value.value;
  }
  if (value?.type === "keyword") {
    return keyworkToValue[value.value];
  }
  return 0;
};

type AxisOption =
  | KeywordValue
  | VarValue
  | (KeywordValue & { description?: string });

type AxisControlProps = {
  label: string;
  description: string;
  property: CssProperty;
  properties?: [CssProperty, ...CssProperty[]];
  value: StyleValue | undefined;
  getOptions: () => Array<AxisOption>;
  unitOptions?: UnitOption[];
  onUpdate: SetValue;
  onDelete: (options?: StyleUpdateOptions) => void;
};

export const BackgroundPositionControl = ({
  label = "Position",
  description = propertyDescriptions.backgroundPosition,
  xAxis,
  yAxis,
  onSelect,
}: {
  label?: string;
  description?: string;
  xAxis: AxisControlProps;
  yAxis: AxisControlProps;
  onSelect: (position: { x: number; y: number }) => void;
}) => {
  const combinedProperties = (() => {
    if (xAxis.properties && yAxis.properties) {
      return [...xAxis.properties, ...yAxis.properties] as [
        CssProperty,
        ...CssProperty[],
      ];
    }
    if (xAxis.properties) {
      return xAxis.properties;
    }
    if (yAxis.properties) {
      return yAxis.properties;
    }
  })();

  return (
    <Flex direction="column" gap="1">
      {combinedProperties ? (
        <PropertyLabel
          label={label}
          description={description}
          properties={combinedProperties}
        />
      ) : (
        <PropertyInlineLabel label={label} description={description} />
      )}
      <Grid gap="2" columns={2}>
        <PositionGrid
          selectedPosition={{
            x: calculateBackgroundPosition(xAxis.value),
            y: calculateBackgroundPosition(yAxis.value),
          }}
          onSelect={onSelect}
        />
        <Grid
          css={{ gridTemplateColumns: "max-content 1fr" }}
          align="center"
          gapX="2"
        >
          {xAxis.properties ? (
            <PropertyLabel
              label={xAxis.label}
              description={xAxis.description}
              properties={xAxis.properties}
            />
          ) : (
            <PropertyInlineLabel
              label={xAxis.label}
              description={xAxis.description}
            />
          )}
          <CssValueInputContainer
            property={xAxis.property}
            styleSource="default"
            getOptions={xAxis.getOptions}
            unitOptions={xAxis.unitOptions}
            value={xAxis.value}
            onUpdate={xAxis.onUpdate}
            onDelete={xAxis.onDelete}
          />
          {yAxis.properties ? (
            <PropertyLabel
              label={yAxis.label}
              description={yAxis.description}
              properties={yAxis.properties}
            />
          ) : (
            <PropertyInlineLabel
              label={yAxis.label}
              description={yAxis.description}
            />
          )}
          <CssValueInputContainer
            property={yAxis.property}
            styleSource="default"
            getOptions={yAxis.getOptions}
            unitOptions={yAxis.unitOptions}
            value={yAxis.value}
            onUpdate={yAxis.onUpdate}
            onDelete={yAxis.onDelete}
          />
        </Grid>
      </Grid>
    </Flex>
  );
};

export const BackgroundPosition = ({ index }: { index: number }) => {
  const [backgroundPositionX, backgroundPositionY] = useComputedStyles([
    "background-position-x",
    "background-position-y",
  ]);
  const xValue = getRepeatedStyleItem(backgroundPositionX, index);
  const yValue = getRepeatedStyleItem(backgroundPositionY, index);
  const setValueX: SetValue = (value, options) => {
    setRepeatedStyleItem(backgroundPositionX, index, value, options);
  };
  const setValueY: SetValue = (value, options) => {
    setRepeatedStyleItem(backgroundPositionY, index, value, options);
  };
  const resetValue = (
    axisValue: StyleValue | undefined,
    setValue: SetValue,
    options?: StyleUpdateOptions
  ) => {
    if (axisValue) {
      setValue(axisValue, options);
    }
  };

  return (
    <BackgroundPositionControl
      xAxis={{
        label: "Left",
        description: "Left position offset",
        property: "background-position-x",
        properties: ["background-position-x"],
        value: xValue,
        getOptions: () => [
          { type: "keyword", value: "center" },
          { type: "keyword", value: "left" },
          { type: "keyword", value: "right" },
        ],
        onUpdate: setValueX,
        onDelete: (options) => resetValue(xValue, setValueX, options),
      }}
      yAxis={{
        label: "Top",
        description: "Top position offset",
        property: "background-position-y",
        properties: ["background-position-y"],
        value: yValue,
        getOptions: () => [
          { type: "keyword", value: "center" },
          { type: "keyword", value: "top" },
          { type: "keyword", value: "bottom" },
        ],
        onUpdate: setValueY,
        onDelete: (options) => resetValue(yValue, setValueY, options),
      }}
      onSelect={({ x, y }) => {
        setRepeatedStyleItem(backgroundPositionX, index, {
          type: "unit",
          value: x,
          unit: "%",
        });
        setRepeatedStyleItem(backgroundPositionY, index, {
          type: "unit",
          value: y,
          unit: "%",
        });
      }}
    />
  );
};
