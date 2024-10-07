import type { StyleValue } from "@webstudio-is/css-engine";
import { propertyDescriptions } from "@webstudio-is/css-data";
import { Flex, Grid, PositionGrid } from "@webstudio-is/design-system";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { PropertyInlineLabel } from "../../property-label";
import { useComputedStyles } from "../../shared/model";
import {
  getRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";

const keyworkToValue: Record<string, number> = {
  left: 0,
  right: 100,
  center: 50,
  top: 0,
  bottom: 100,
};

const calculateBackgroundPosition = (value: undefined | StyleValue) => {
  if (value?.type === "unit") {
    return value.value;
  }
  if (value?.type === "keyword") {
    return keyworkToValue[value.value];
  }
  return 0;
};

export const BackgroundPosition = ({ index }: { index: number }) => {
  const [backgroundPositionX, backgroundPositionY] = useComputedStyles([
    "backgroundPositionX",
    "backgroundPositionY",
  ]);
  const xValue = getRepeatedStyleItem(backgroundPositionX, index);
  const yValue = getRepeatedStyleItem(backgroundPositionY, index);
  const x = calculateBackgroundPosition(xValue);
  const y = calculateBackgroundPosition(yValue);

  return (
    <Flex direction="column" gap="1">
      <PropertyInlineLabel
        label="Position"
        description={propertyDescriptions.backgroundPosition}
        properties={["backgroundPositionX", "backgroundPositionY"]}
      />
      <Flex gap="6">
        <PositionGrid
          selectedPosition={{ x, y }}
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
        <Grid
          css={{ gridTemplateColumns: "max-content 1fr" }}
          align="center"
          gapX="2"
        >
          <PropertyInlineLabel
            label="Left"
            description="Left position offset"
            properties={["backgroundPositionX"]}
          />
          <CssValueInputContainer
            property="backgroundPositionX"
            styleSource="default"
            getOptions={() => [
              { type: "keyword", value: "center" },
              { type: "keyword", value: "left" },
              { type: "keyword", value: "right" },
            ]}
            value={xValue}
            setValue={(value, options) => {
              setRepeatedStyleItem(backgroundPositionX, index, value, options);
            }}
            deleteProperty={() => {
              if (xValue) {
                setRepeatedStyleItem(backgroundPositionX, index, xValue);
              }
            }}
          />
          <PropertyInlineLabel
            label="Top"
            description="Top position offset"
            properties={["backgroundPositionY"]}
          />
          <CssValueInputContainer
            property="backgroundPositionY"
            styleSource="default"
            getOptions={() => [
              { type: "keyword", value: "center" },
              { type: "keyword", value: "top" },
              { type: "keyword", value: "bottom" },
            ]}
            value={yValue}
            setValue={(value, options) => {
              setRepeatedStyleItem(backgroundPositionY, index, value, options);
            }}
            deleteProperty={() => {
              if (yValue) {
                setRepeatedStyleItem(backgroundPositionY, index, yValue);
              }
            }}
          />
        </Grid>
      </Flex>
    </Flex>
  );
};
