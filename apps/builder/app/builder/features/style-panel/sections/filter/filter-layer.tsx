import { FloatingPanel } from "~/builder/shared/floating-panel";
import type { LayerProps } from "../../style-layers-list";
import { FilterSectionContent } from "./filter-content";
import {
  CssValueListItem,
  Label,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { SubtractIcon } from "@webstudio-is/icons";
import { useMemo } from "react";
import { FunctionValue, toValue } from "@webstudio-is/css-engine";

export const FilterLayer = <T extends FunctionValue>(props: LayerProps<T>) => {
  const { index, id, layer, isHighlighted, onDeleteLayer, label } = props;
  const filter = useMemo(() => toValue(layer), [layer]);

  return (
    <FloatingPanel
      title={label}
      content={
        <FilterSectionContent
          property={props.property}
          index={index}
          filter={filter}
          onEditLayer={props.onEditLayer}
          deleteProperty={props.deleteProperty}
          tooltip={props.tooltip}
        />
      }
    >
      <CssValueListItem
        id={id}
        draggable={true}
        active={isHighlighted}
        index={index}
        label={<Label truncate>{filter}</Label>}
        buttons={
          <>
            <SmallIconButton
              variant="destructive"
              tabIndex={-1}
              icon={<SubtractIcon />}
              onClick={() => onDeleteLayer(index)}
            />
          </>
        }
      />
    </FloatingPanel>
  );
};
