import { useMemo } from "react";
import {
  CssValueListItem,
  Label,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { SubtractIcon } from "@webstudio-is/icons";
import type { TupleValue } from "@webstudio-is/css-engine";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransitionContent } from "./transition-content";
import type { LayerProps } from "../../style-layers-list";

const useLayer = (layer: TupleValue) => {
  return useMemo(() => {
    const name: string[] = [];

    for (const item of Object.values(layer.value)) {
      if (item.type === "keyword") {
        name.push(item.value);
      }

      if (item.type === "unit") {
        name.push(`${item.value}${item.unit}`);
      }
    }

    return {
      name: name.join(" "),
      transition: name.join(" "),
    };
  }, [layer]);
};

export const Layer = (props: LayerProps) => {
  const { id, index, layer, isHighlighted, onDeleteLayer, disabled } = props;
  const { name, transition } = useLayer(layer);

  return (
    <FloatingPanel
      title="Transitions"
      content={
        <TransitionContent
          index={index}
          value={transition}
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
