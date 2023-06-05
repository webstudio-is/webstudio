import type { StyleProperty, TupleValue } from "@webstudio-is/css-data";
import {
  theme,
  Grid,
  Label,
  SmallIconButton,
  SmallToggleButton,
} from "@webstudio-is/design-system";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { useMemo } from "react";

export const Layer = (props: {
  index: number;
  layer: TupleValue;
  property: StyleProperty;
  onLayerHide: (index: number) => void;
  onDeleteLayer: (index: number) => void;
}) => {
  const { index, layer, onDeleteLayer, onLayerHide } = props;
  const layerName = useMemo(() => {
    let name = "";
    for (const item of Object.values(layer.value)) {
      if (item.type === "unit" && item.unit !== "number") {
        name = name + ` ${item.value}${item.unit}`;
      }

      if (
        item.type === "keyword" ||
        (item.type === "unit" && item.unit === "number")
      ) {
        name = name + " " + item.value;
      }
    }

    return name;
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
