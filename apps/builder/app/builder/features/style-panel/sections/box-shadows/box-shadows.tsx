import { colord, type RgbaColor } from "colord";
import {
  toValue,
  type CssProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { RepeatedStyleSection } from "../../shared/style-section";
import { ShadowContent } from "../../shared/shadow-content";
import { useComputedStyleDecl } from "../../shared/model";
import {
  addRepeatedStyleItem,
  editRepeatedStyleItem,
  getComputedRepeatedItem,
  RepeatedStyle,
} from "../../shared/repeated-style";
import { parseCssFragment } from "../../shared/css-fragment";

export const properties = ["box-shadow"] satisfies [
  CssProperty,
  ...CssProperty[],
];

const label = "Box Shadows";
const initialBoxShadow = "0px 2px 5px 0px rgba(0, 0, 0, 0.2)";

const getItemProps = (layer: StyleValue, computedLayer?: StyleValue) => {
  let values: StyleValue[] = [];
  if (layer.type === "tuple") {
    values = layer.value;
  }
  if (layer.type === "var" && computedLayer?.type === "tuple") {
    values = computedLayer.value;
  }
  const labels = [];
  let color: RgbaColor | undefined;
  let isInset = false;

  if (layer.type === "var") {
    labels.push(`--${layer.value}`);
  }
  for (const item of values) {
    if (item.type === "rgb") {
      color = colord(toValue(item)).toRgb();
      continue;
    }
    if (item.type === "keyword") {
      if (item.value === "inset") {
        isInset = true;
        continue;
      }
      if (colord(item.value).isValid()) {
        color = colord(item.value).toRgb();
        continue;
      }
    }
    if (layer.type !== "var") {
      labels.push(toValue(item));
    }
  }

  if (isInset) {
    labels.unshift("Inner Shadow:");
  } else {
    labels.unshift("Outer Shadow:");
  }

  return { label: labels.join(" "), color };
};

export const Section = () => {
  const styleDecl = useComputedStyleDecl("boxShadow");

  return (
    <RepeatedStyleSection
      label={label}
      description="Adds shadow effects around an element's frame."
      properties={properties}
      onAdd={() => {
        addRepeatedStyleItem(
          [styleDecl],
          parseCssFragment(initialBoxShadow, ["boxShadow"])
        );
      }}
    >
      <RepeatedStyle
        label={label}
        styles={[styleDecl]}
        getItemProps={(index, layer) =>
          getItemProps(layer, getComputedRepeatedItem(styleDecl, index))
        }
        renderItemContent={(index, value) => (
          <ShadowContent
            index={index}
            layer={value}
            computedLayer={getComputedRepeatedItem(styleDecl, index)}
            property="box-shadow"
            propertyValue={toValue(value)}
            onEditLayer={(index, value, options) => {
              editRepeatedStyleItem(
                [styleDecl],
                index,
                new Map([["box-shadow", value]]),
                options
              );
            }}
          />
        )}
      />
    </RepeatedStyleSection>
  );
};
