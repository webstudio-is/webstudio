import { keywordValues } from "@webstudio-is/css-data";
import { Flex, Grid, PositionGrid } from "@webstudio-is/design-system";
import { getStyleSource, type StyleInfo } from "../../shared/style-info";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { NonResetablePropertyName } from "../../shared/property-name";
import type { DeleteProperty, SetProperty } from "../../shared/use-style-data";

export const BackgroundPosition = ({
  currentStyle,
  setProperty,
  deleteProperty,
}: {
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
}) => {
  const xInfo = currentStyle.backgroundPositionX;
  const x = xInfo?.value.type === "unit" ? xInfo.value.value : 0;
  const yInfo = currentStyle.backgroundPositionY;
  const y = yInfo?.value.type === "unit" ? yInfo.value.value : 0;

  return (
    <Flex direction="column" gap="1">
      <NonResetablePropertyName
        style={currentStyle}
        properties={["backgroundPositionX", "backgroundPositionY"]}
        label="Position"
      />
      <Flex gap="6">
        <PositionGrid
          selectedPosition={{ x, y }}
          onSelect={({ x, y }) => {
            setProperty("backgroundPositionX")({
              type: "unit",
              value: x,
              unit: "%",
            });
            setProperty("backgroundPositionY")({
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
          <NonResetablePropertyName
            style={currentStyle}
            properties={["backgroundPositionX"]}
            description="Left position offset"
            label="Left"
          />
          <CssValueInputContainer
            property="backgroundPositionX"
            styleSource={getStyleSource(xInfo)}
            keywords={keywordValues.backgroundPositionX.map((value) => ({
              type: "keyword",
              value,
            }))}
            value={xInfo?.value}
            setValue={setProperty("backgroundPositionX")}
            deleteProperty={deleteProperty}
          />
          <NonResetablePropertyName
            style={currentStyle}
            properties={["backgroundPositionY"]}
            description="Top position offset"
            label="Top"
          />
          <CssValueInputContainer
            property="backgroundPositionY"
            styleSource={getStyleSource(yInfo)}
            keywords={keywordValues.backgroundPositionY.map((value) => ({
              type: "keyword",
              value,
            }))}
            value={yInfo?.value}
            setValue={setProperty("backgroundPositionY")}
            deleteProperty={deleteProperty}
          />
        </Grid>
      </Flex>
    </Flex>
  );
};
