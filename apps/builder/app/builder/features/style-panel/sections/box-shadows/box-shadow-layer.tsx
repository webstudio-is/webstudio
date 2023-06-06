import type { LayersValue, TupleValue } from "@webstudio-is/css-data";
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
import { colord } from "colord";

export const Layer = (
  props: Pick<RenderCategoryProps, "createBatchUpdate"> & {
    index: number;
    layer: TupleValue;
    onLayerHide: (index: number) => void;
    onDeleteLayer: (index: number) => void;
    onEditLayer: (index: number, layers: LayersValue) => void;
  }
) => {
  const { index, layer, onDeleteLayer, onLayerHide } = props;
  const [layerName, shadow] = useMemo(() => {
    let name = "";
    let shadow = "";
    for (const item of Object.values(layer.value)) {
      if (item.type === "unit") {
        name +=
          item.unit === "number"
            ? ` ${item.value}`
            : ` ${item.value}${item.unit}`;
        shadow = name;
      }

      if (item.type === "rgb") {
        shadow = `${name} rgba(${item.r}, ${item.g}, ${item.b}, ${item.alpha})`;
      }

      if (item.type === "keyword") {
        if (colord(item.value).isValid() === false) {
          name += ` ${item.value}`;
        }
        shadow += ` ${item.value}`;
      }
    }

    return [name, shadow];
  }, [layer]);

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
        nodrag={true}
        label={<Label truncate>{layerName}</Label>}
        hidden={layer?.hidden}
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
