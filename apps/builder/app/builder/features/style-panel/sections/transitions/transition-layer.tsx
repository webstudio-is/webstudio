import { useMemo } from "react";
import {
  CssValueListItem,
  Label,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { SubtractIcon } from "@webstudio-is/icons";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransitionContent } from "./transition-content";
import { LayersValue, TupleValue, toValue } from "@webstudio-is/css-engine";
import { findTimingFunctionFromValue } from "./transition-utils";
import type {
  CreateBatchUpdate,
  DeleteProperty,
} from "../../shared/use-style-data";

const useLayer = (layer: TupleValue) => {
  return useMemo(() => {
    const label: TupleValue = {
      type: "tuple",
      value: [],
    };

    for (const prop of layer.value) {
      if (prop.type === "keyword") {
        label.value.push({
          type: "keyword",
          value: findTimingFunctionFromValue(prop.value) ?? prop.value,
        });
      } else {
        label.value.push(prop);
      }
    }

    return { transition: toValue(layer), label: toValue(label) };
  }, [layer]);
};

export const TransitionLayer = (props: {
  id: string;
  index: number;
  layer: TupleValue;
  label: string;
  tooltip: JSX.Element;
  isHighlighted: boolean;
  disabled?: boolean;
  onLayerHide: (index: number) => void;
  onDeleteLayer: (index: number) => void;
  onEditLayer: (index: number, layers: LayersValue | TupleValue) => void;
  createBatchUpdate: CreateBatchUpdate;
  deleteProperty: DeleteProperty;
}) => {
  const { id, index, layer, isHighlighted, onDeleteLayer, disabled } = props;
  const properties = useLayer(layer);

  const { transition, label } = properties;

  return (
    <FloatingPanel
      title="Transition"
      content={
        <TransitionContent
          index={index}
          layer={layer}
          transition={transition}
          onEditLayer={props.onEditLayer}
          deleteProperty={props.deleteProperty}
        />
      }
    >
      <CssValueListItem
        id={id}
        draggable
        active={isHighlighted}
        index={index}
        label={<Label truncate>{label}</Label>}
        hidden={disabled ?? layer?.hidden}
        buttons={
          <>
            <SmallIconButton
              variant="destructive"
              tabIndex={-1}
              disabled={disabled || layer?.hidden}
              icon={<SubtractIcon />}
              onClick={() => onDeleteLayer(index)}
            />
          </>
        }
      ></CssValueListItem>
    </FloatingPanel>
  );
};
