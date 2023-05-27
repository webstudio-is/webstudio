import type {
  LayersValue,
  StyleProperty,
  UnparsedValue,
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

type BoxShadowLayerProperies = Pick<
  RenderCategoryProps,
  "currentStyle" | "deleteProperty" | "setProperty"
> & {
  value: LayersValue;
  property: StyleProperty;
};

export const BoxShadowLayersList: React.FC<BoxShadowLayerProperies> = ({
  property,
  value,
  ...props
}) => {
  const layers: UnparsedValue[] = useMemo(() => {
    return (
      value.value.filter(
        (layer) => layer.type === "unparsed"
      ) as UnparsedValue[]
    ).sort((a, b) => a.value.localeCompare(b.value));
  }, [value]);

  const getFilteredLayersByValue = (key: string) =>
    value.value.filter((layer) => layer.value !== key);

  const handleHideLayer = (newValue: UnparsedValue, hidden: boolean) => {
    props.setProperty(property)({
      type: "layers",
      value: [
        ...getFilteredLayersByValue(newValue.value),
        {
          ...newValue,
          hidden,
        },
      ],
    });
  };

  const handleDeleteLayer = (newValue: UnparsedValue) => {
    props.setProperty(property)({
      type: "layers",
      value: getFilteredLayersByValue(newValue.value),
    });
  };

  return (
    <Flex direction="column" gap={2}>
      {layers.map((shadow, index) => {
        return (
          <Layer
            key={index}
            property={property}
            layer={shadow}
            onLayerHide={handleHideLayer}
            onDeleteLayer={handleDeleteLayer}
          />
        );
      })}
    </Flex>
  );
};

const Layer: React.FC<{
  layer: UnparsedValue;
  property: StyleProperty;
  onLayerHide: (value: UnparsedValue, hidden: boolean) => void;
  onDeleteLayer: (value: UnparsedValue) => void;
}> = ({ layer, onLayerHide, onDeleteLayer }) => {
  const isLayerHidden = layer.hidden;

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
      <WrappedLabel>{layer.value}</WrappedLabel>
      <SmallToggleButton
        variant="normal"
        disabled={false}
        onPressedChange={() => onLayerHide(layer, !isLayerHidden)}
        icon={isLayerHidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
      />
      <SmallIconButton
        variant="destructive"
        tabIndex={-1}
        icon={<SubtractIcon />}
        onClick={() => onDeleteLayer(layer)}
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
