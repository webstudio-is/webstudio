import type { RenderCategoryProps } from "../../style-sections";
import { styleConfigByName } from "../../shared/configs";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import {
  Button,
  CssValueListItem,
  Flex,
  Grid,
  SmallIconButton,
  styled,
  theme,
} from "@webstudio-is/design-system";
import { SmallToggleButton } from "@webstudio-is/design-system";
import {
  EyeconOpenIcon,
  EyeconClosedIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { useState } from "react";
import { PropertyName } from "../../shared/property-name";
import type { StyleInfo } from "../../shared/style-info";
import { ColorControl } from "../../controls/color/color-control";
import {
  getLayerCount,
  layeredBackgroundProps,
  addLayer,
  deleteLayer,
  setLayerProperty,
  type SetBackgroundProperty,
  getLayerBackgroundStyleInfo,
} from "./background-layers";
import { BackgroundContent } from "./background-content";

const Thumbnail = styled("div", {
  width: theme.spacing[10],
  height: theme.spacing[10],
  backgroundImage: "linear-gradient(yellow, red)",
});

const getLayerName = (styleInfo: StyleInfo) => {
  const backgroundStyle = styleInfo.backgroundImage?.value;
  if (backgroundStyle?.type === "image") {
    return backgroundStyle.value.value.name;
  }

  if (backgroundStyle?.type === "unparsed") {
    return "Gradient";
  }

  return "None";
};

const Layer = (props: {
  layerStyle: StyleInfo;
  setProperty: SetBackgroundProperty;
  deleteLayer: () => void;
}) => {
  const [hidden, setHidden] = useState(false);

  return (
    <FloatingPanel
      title="Images"
      content={
        <BackgroundContent
          currentStyle={props.layerStyle}
          setProperty={props.setProperty}
        />
      }
    >
      <CssValueListItem
        label={
          <PropertyName
            style={props.layerStyle}
            property={layeredBackgroundProps}
            label={getLayerName(props.layerStyle)}
            onReset={props.deleteLayer}
          />
        }
        thumbnail={<Thumbnail />}
        hidden={hidden}
        buttons={
          <>
            <SmallToggleButton
              pressed={hidden}
              onPressedChange={setHidden}
              variant="normal"
              tabIndex={0}
              icon={hidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
            />

            <SmallIconButton
              variant="destructive"
              tabIndex={0}
              icon={<SubtractIcon />}
              onClick={props.deleteLayer}
            />
          </>
        }
      />
    </FloatingPanel>
  );
};

export const BackgroundsSection = ({
  setProperty,
  deleteProperty,
  currentStyle,
  createBatchUpdate,
}: RenderCategoryProps) => {
  const layersCount = getLayerCount(currentStyle);

  const { items } = styleConfigByName["backgroundColor"];
  return (
    <Flex gap={1} direction="column">
      {Array.from(Array(layersCount).keys()).map((layerNum) => (
        <Layer
          key={layerNum}
          layerStyle={getLayerBackgroundStyleInfo(layerNum, currentStyle)}
          deleteLayer={deleteLayer(layerNum, currentStyle, createBatchUpdate)}
          setProperty={setLayerProperty(
            layerNum,
            currentStyle,
            createBatchUpdate
          )}
        />
      ))}

      <Flex css={{ px: theme.spacing[9] }} direction="column" gap={2}>
        <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
          <PropertyName
            style={currentStyle}
            property={"backgroundColor"}
            label={"Color"}
            onReset={() => deleteProperty("backgroundColor")}
          />

          <ColorControl
            property={"backgroundColor"}
            items={items}
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Grid>
        <Button
          color="neutral"
          onClick={() => {
            addLayer(currentStyle, createBatchUpdate);
          }}
        >
          Add layer
        </Button>
      </Flex>
    </Flex>
  );
};
