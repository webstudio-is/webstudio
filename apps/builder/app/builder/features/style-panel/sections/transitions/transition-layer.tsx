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
import { convertTupleToStringValue } from "./transition-utils";

export const Layer = (props: LayerProps) => {
  const { id, index, layer, isHighlighted, onDeleteLayer, disabled } = props;
  const transition = useMemo(() => convertTupleToStringValue(layer), [layer]);

  return (
    <FloatingPanel
      title="Transitions"
      content={
        <TransitionContent
          index={index}
          layer={layer}
          transition={transition}
          onEditLayer={props.onEditLayer}
          createBatchUpdate={props.createBatchUpdate}
        />
      }
    >
      <CssValueListItem
        id={id}
        active={isHighlighted}
        index={index}
        label={<Label truncate>{transition}</Label>}
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
