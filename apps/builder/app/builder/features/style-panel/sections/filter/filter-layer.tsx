import { FloatingPanel } from "~/builder/shared/floating-panel";
import type { LayerProps } from "../../style-layers-list";
import { FilterSectionContent } from "./filter-content";
import {
  CssValueListItem,
  Label,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { SubtractIcon } from "@webstudio-is/icons";

export const FilterLayer = (props: LayerProps) => {
  const { index, id, layer, isHighlighted, onDeleteLayer } = props;

  if (layer.type !== "keyword") {
    return;
  }

  return (
    <FloatingPanel
      title="Filter"
      content={
        <FilterSectionContent
          index={index}
          layer={layer}
          filter={layer.value}
          onEditLayer={props.onEditLayer}
        />
      }
    >
      <CssValueListItem
        id={id}
        draggable={true}
        active={isHighlighted}
        index={index}
        label={<Label truncate>{layer.value}</Label>}
        buttons={
          <SmallIconButton
            variant="destructive"
            tabIndex={-1}
            icon={<SubtractIcon />}
            onClick={(event) => {
              onDeleteLayer(index);
              event.preventDefault();
            }}
          />
        }
      />
    </FloatingPanel>
  );
};
