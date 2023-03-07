import type { RenderCategoryProps } from "../../style-sections";
import { styleConfigByName } from "../../shared/configs";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import {
  Button,
  CssValueListItem,
  Flex,
  Grid,
  SmallIconButton,
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
  type DeleteBackgroundProperty,
  getLayerBackgroundStyleInfo,
  deleteLayerProperty,
} from "./background-layers";
import { BackgroundContent } from "./background-content";
import { getLayerName, LayerThumbnail } from "./background-thumbnail";

const Layer = (props: {
  layerStyle: StyleInfo;
  setProperty: SetBackgroundProperty;
  deleteProperty: DeleteBackgroundProperty;
  deleteLayer: () => void;
}) => {
  const [hidden, setHidden] = useState(false);

  return (
    <FloatingPanel
      title="Background"
      content={
        <BackgroundContent
          currentStyle={props.layerStyle}
          setProperty={props.setProperty}
          deleteProperty={props.deleteProperty}
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
        thumbnail={<LayerThumbnail layerStyle={props.layerStyle} />}
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
      {Array.from(Array(layersCount), (_, layerNum) => (
        <Layer
          key={layerNum}
          layerStyle={getLayerBackgroundStyleInfo(layerNum, currentStyle)}
          deleteLayer={deleteLayer(layerNum, currentStyle, createBatchUpdate)}
          setProperty={setLayerProperty(
            layerNum,
            currentStyle,
            createBatchUpdate
          )}
          deleteProperty={deleteLayerProperty(
            layerNum,
            currentStyle,
            deleteProperty,
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
