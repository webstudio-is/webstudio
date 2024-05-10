import {
  toValue,
  type FunctionValue,
  type LayersValue,
  type StyleProperty,
  type TupleValue,
} from "@webstudio-is/css-engine";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  Label,
  SmallIconButton,
  SmallToggleButton,
  useSortable,
} from "@webstudio-is/design-system";
import type { SectionProps } from "./sections";
import {
  deleteLayer,
  getLayerCount,
  hideLayer,
  swapLayers,
  updateLayer,
} from "./style-layer-utils";
import { useMemo } from "react";
import type { DeleteProperty } from "./shared/use-style-data";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { ColorThumb } from "./shared/color-thumb";
import { colord, type RgbaColor } from "colord";

type LayerListProps = SectionProps & {
  disabled?: boolean;
  label: string;
  property: StyleProperty;
  value: TupleValue | LayersValue;
  renderContent: (props: {
    index: number;
    layer: TupleValue | FunctionValue;
    property: StyleProperty;
    propertyValue: string;
    onDeleteLayer: (index: number) => void;
    onEditLayer: (index: number, layers: TupleValue | LayersValue) => void;
    deleteProperty: DeleteProperty;
  }) => JSX.Element;
};

const extractPropertiesFromLayer = (layer: TupleValue | FunctionValue) => {
  if (layer.type === "function") {
    return { name: toValue(layer), value: toValue(layer), color: undefined };
  }

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

  return { name: name.join(" "), value: shadow.join(" "), color };
};

export const LayersList = ({
  label,
  property,
  value,
  currentStyle,
  createBatchUpdate,
  renderContent,
  deleteProperty,
}: LayerListProps) => {
  const layersCount = getLayerCount(property, currentStyle);

  const sortableItems = useMemo(
    () =>
      Array.from(Array(layersCount), (_, index) => ({
        id: String(index),
        index,
      })),
    [layersCount]
  );

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: sortableItems,
    onSort: (newIndex, oldIndex) => {
      swapLayers(property, newIndex, oldIndex, currentStyle, createBatchUpdate);
    },
  });

  const handleDeleteLayer = (index: number) => {
    return deleteLayer(property, index, value, createBatchUpdate);
  };

  const handleHideLayer = (index: number) => {
    if (value.type === "tuple") {
      return;
    }
    return hideLayer(property, index, value, createBatchUpdate);
  };

  const onEditLayer = (index: number, newLayers: TupleValue | LayersValue) => {
    return updateLayer(property, newLayers, value, index, createBatchUpdate);
  };

  return (
    <CssValueListArrowFocus dragItemId={dragItemId}>
      <Flex direction="column" ref={sortableRefCallback}>
        {value.value.map((layer, index) => {
          if (layer.type !== "tuple" && layer.type !== "function") {
            return;
          }
          const id = String(index);
          const properties = extractPropertiesFromLayer(layer);
          const { name, value, color } = properties;

          return (
            <FloatingPanel
              key={index}
              title={label}
              content={renderContent({
                index,
                property,
                layer,
                onEditLayer,
                propertyValue: value,
                onDeleteLayer: handleDeleteLayer,
                deleteProperty,
              })}
            >
              <CssValueListItem
                id={id}
                draggable={true}
                active={dragItemId === id}
                index={index}
                label={<Label truncate>{name}</Label>}
                hidden={layer.type === "tuple" && layer?.hidden}
                thumbnail={
                  property === "textShadow" || property === "boxShadow" ? (
                    <ColorThumb color={color} />
                  ) : undefined
                }
                buttons={
                  <>
                    {layer.type === "tuple" ? (
                      <SmallToggleButton
                        variant="normal"
                        pressed={layer?.hidden}
                        disabled={false}
                        tabIndex={-1}
                        onPressedChange={() => handleHideLayer(index)}
                        icon={
                          layer?.hidden ? (
                            <EyeconClosedIcon />
                          ) : (
                            <EyeconOpenIcon />
                          )
                        }
                      />
                    ) : undefined}
                    <SmallIconButton
                      variant="destructive"
                      tabIndex={-1}
                      disabled={layer.type === "tuple" && layer.hidden}
                      icon={<SubtractIcon />}
                      onClick={() => handleDeleteLayer(index)}
                    />
                  </>
                }
              />
            </FloatingPanel>
          );
        })}
        {placementIndicator}
      </Flex>
    </CssValueListArrowFocus>
  );
};
