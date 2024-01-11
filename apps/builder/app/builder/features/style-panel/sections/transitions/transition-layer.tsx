import { useMemo } from "react";
import {
  CssValueListItem,
  Label,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { SubtractIcon } from "@webstudio-is/icons";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransitionContent } from "./transition-content";
import type { LayerProps } from "../../style-layers-list";
import { TupleValue, toValue } from "@webstudio-is/css-engine";
import { findTimingFunctionFromValue } from "./transition-utils";

export const Layer = (props: LayerProps) => {
  const { id, index, layer, isHighlighted, onDeleteLayer, disabled } = props;
  const { transition, label } = useMemo(() => {
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
