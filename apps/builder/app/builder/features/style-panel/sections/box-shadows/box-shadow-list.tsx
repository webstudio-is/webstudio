import type {
  LayersValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-data";
import {
  Flex,
  Grid,
  Label,
  SmallIconButton,
  SmallToggleButton,
} from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { theme, styled } from "@webstudio-is/design-system";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { useMemo } from "react";

type BoxShadowLayerProperies = RenderCategoryProps & {
  layers: LayersValue;
  property: StyleProperty;
};

export const BoxShadowLayersList: React.FC<BoxShadowLayerProperies> = ({
  property,
  layers,
  createBatchUpdate,
}) => {
  const handleDeleteLayer = (index: number) => {
    const batch = createBatchUpdate();
    const layer = layers.value[index];

    const canLayerBeHidden =
      layer.type === "tuple" || layer.type === "unparsed";
    if (!canLayerBeHidden) {
      return;
    }
    const newLayers = [...layers.value];
    newLayers.splice(index, 1);
    batch.setProperty(property)({
      type: "layers",
      value: newLayers,
    });

    batch.publish();
  };

  const handleHideLayer = (index: number) => {
    const batch = createBatchUpdate();
    const layer = layers.value[index];

    const canLayerBeHidden =
      layer.type === "tuple" || layer.type === "unparsed";
    if (!canLayerBeHidden) {
      return;
    }
    const newLayers = [...layers.value];
    newLayers.splice(index, 1);
    batch.setProperty(property)({
      type: "layers",
      value: [...newLayers, { ...layer, hidden: !layer?.hidden }],
    });

    batch.publish();
  };

  return (
    <Flex direction="column" gap={2}>
      {layers.value.map((layer, index) => {
        if (layer.type === "tuple") {
          return (
            <Layer
              key={index}
              index={index}
              property={property}
              layer={layer}
              onLayerHide={handleHideLayer}
              onDeleteLayer={handleDeleteLayer}
            />
          );
        }
        return null;
      })}
    </Flex>
  );
};

const Layer: React.FC<{
  index: number;
  layer: TupleValue;
  property: StyleProperty;
  onLayerHide: (index: number) => void;
  onDeleteLayer: (index: number) => void;
}> = ({ index, layer, onDeleteLayer, onLayerHide }) => {
  const layerNamer = useMemo(() => {
    return layer.value.reduce((acc: string, item) => {
      if (item.type === "unit" && item.unit !== "number") {
        acc = acc + " " + `${item.value}${item.unit}`;
      }

      if (
        item.type === "keyword" ||
        (item.type === "unit" && item.unit === "number")
      ) {
        acc = acc + " " + item.value;
      }
      return acc;
    }, ``);
  }, [layer]);

  return (
    <Grid
      align="center"
      gap={2}
      css={{
        gridTemplateColumns: `10fr 1fr 1fr`,
        paddingLeft: theme.spacing[6],
        paddingRight: theme.spacing[9],
        backgroundColor: theme.colors.backgroundPanel,
      }}
    >
      <WrappedLabel>{layerNamer}</WrappedLabel>
      <SmallToggleButton
        variant="normal"
        disabled={false}
        onPressedChange={() => onLayerHide(index)}
        icon={layer?.hidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
      />
      <SmallIconButton
        variant="destructive"
        tabIndex={-1}
        icon={<SubtractIcon />}
        onClick={() => onDeleteLayer(index)}
      />
    </Grid>
  );
};

export const WrappedLabel = styled(Label, {
  textOverflow: "ellipsis",
  overflow: "hidden",
  whiteSpace: "nowrap",
  width: "90",

  "&:hover": {
    backgroundColor: theme.colors.backgroundHover,
    [`& ${Grid}`]: {
      backgroundColor: theme.colors.backgroundHover,
    },
  },
});
