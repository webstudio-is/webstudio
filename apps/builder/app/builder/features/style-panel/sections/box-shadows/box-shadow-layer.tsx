import type { LayersValue, TupleValue } from "@webstudio-is/css-engine";
import {
  Label,
  SmallIconButton,
  SmallToggleButton,
  CssValueListItem,
} from "@webstudio-is/design-system";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { useMemo } from "react";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { BoxShadowContent } from "./box-shadow-content";
import type { RenderCategoryProps } from "../../style-sections";
import { colord, type RgbaColor } from "colord";
import { toValue } from "@webstudio-is/css-engine";
import { ColorThumb } from "../../shared/color-thumb";

const useLayer = (layer: TupleValue) => {
  return useMemo(() => {
    const name = [];
    const shadow = [];
    let color: RgbaColor | undefined;
    for (const item of Object.values(layer.value)) {
      if (item.type === "unit") {
        const value = toValue(item);
        name.push(value);
        shadow.push(value);
      }

      if (item.type === "rgb") {
        color = colord(toValue(item)).toRgb();
        shadow.push(toValue(item));
      }

      if (item.type === "keyword") {
        if (colord(item.value).isValid() === false) {
          name.push(item.value);
        } else {
          color = colord(item.value).toRgb();
        }
        shadow.push(item.value);
      }
    }

    return { name: name.join(" "), shadow: shadow.join(" "), color };
  }, [layer]);
};

export const Layer = (
  props: Pick<RenderCategoryProps, "createBatchUpdate"> & {
    id: string;
    index: number;
    layer: TupleValue;
    isHighlighted: boolean;
    onLayerHide: (index: number) => void;
    onDeleteLayer: (index: number) => void;
    onEditLayer: (index: number, layers: LayersValue) => void;
  }
) => {
  const { index, id, layer, isHighlighted, onDeleteLayer, onLayerHide } = props;
  const { name, shadow, color } = useLayer(layer);

  return (
    <FloatingPanel
      title="Box Shadow"
      content={
        <BoxShadowContent
          index={index}
          value={shadow}
          onEditLayer={props.onEditLayer}
          createBatchUpdate={props.createBatchUpdate}
        />
      }
    >
      <CssValueListItem
        id={id}
        active={isHighlighted}
        index={index}
        label={<Label truncate>{name}</Label>}
        hidden={layer?.hidden}
        thumbnail={<ColorThumb color={color} />}
        buttons={
          <>
            <SmallToggleButton
              variant="normal"
              pressed={layer?.hidden}
              disabled={false}
              tabIndex={-1}
              onPressedChange={() => onLayerHide(index)}
              icon={layer?.hidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
            />
            <SmallIconButton
              variant="destructive"
              tabIndex={-1}
              icon={<SubtractIcon />}
              onClick={(event) => {
                onDeleteLayer(index);
                event.preventDefault();
              }}
            />
          </>
        }
      ></CssValueListItem>
    </FloatingPanel>
  );
};
