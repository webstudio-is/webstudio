import type { StyleProperty, TupleValue } from "@webstudio-is/css-data";
import {
  Grid,
  Label,
  SmallIconButton,
  SmallToggleButton,
} from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { useMemo } from "react";

export const Layer: React.FC<{
  index: number;
  layer: TupleValue;
  property: StyleProperty;
  onLayerHide: (index: number) => void;
  onDeleteLayer: (index: number) => void;
}> = ({ index, layer, onDeleteLayer, onLayerHide }) => {
  const layerName = useMemo(() => {
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
      data-shadow={index}
      align="center"
      gap={2}
      css={{
        gridTemplateColumns: `10fr 1fr 1fr`,
        paddingLeft: theme.spacing[6],
        paddingRight: theme.spacing[6],
        backgroundColor: theme.colors.backgroundPanel,
        height: theme.spacing["13"],
        "&:hover": {
          backgroundColor: theme.colors.backgroundHover,
        },
      }}
    >
      <Label>{layerName}</Label>
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
