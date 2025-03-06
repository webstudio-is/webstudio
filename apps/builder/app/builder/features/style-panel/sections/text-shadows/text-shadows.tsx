import { colord, type RgbaColor } from "colord";
import {
  toValue,
  type CssProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { RepeatedStyleSection } from "../../shared/style-section";
import { ShadowContent } from "../../shared/shadow-content";
import {
  addRepeatedStyleItem,
  editRepeatedStyleItem,
  getComputedRepeatedItem,
  RepeatedStyle,
} from "../../shared/repeated-style";
import { parseCssFragment } from "../../shared/css-fragment";
import { useComputedStyleDecl } from "../../shared/model";

export const properties = ["text-shadow"] satisfies [
  CssProperty,
  ...CssProperty[],
];

const label = "Text Shadows";
const initialTextShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";

const getItemProps = (layer: StyleValue, computedLayer?: StyleValue) => {
  let values: StyleValue[] = [];
  if (layer.type === "tuple") {
    values = layer.value;
  }
  if (layer.type === "var" && computedLayer?.type === "tuple") {
    values = computedLayer.value;
  }
  const labels = ["Text Shadow:"];
  let color: RgbaColor | undefined;

  if (layer.type === "var") {
    labels.push(`--${layer.value}`);
  }
  for (const item of values) {
    if (item.type === "rgb") {
      color = colord(toValue(item)).toRgb();
      continue;
    }
    if (item.type === "keyword" && colord(item.value).isValid()) {
      color = colord(item.value).toRgb();
      continue;
    }
    if (layer.type !== "var") {
      labels.push(toValue(item));
    }
  }

  return { label: labels.join(" "), color };
};

export const Section = () => {
  const styleDecl = useComputedStyleDecl("textShadow");

  return (
    <RepeatedStyleSection
      label={label}
      description="Adds shadow effects around a text."
      properties={properties}
      onAdd={() => {
        addRepeatedStyleItem(
          [styleDecl],
          parseCssFragment(initialTextShadow, ["textShadow"])
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
            property="text-shadow"
            propertyValue={toValue(value)}
            onEditLayer={(index, value, options) => {
              editRepeatedStyleItem(
                [styleDecl],
                index,
                new Map([["text-shadow", value]]),
                options
              );
            }}
          />
        )}
      />
    </RepeatedStyleSection>
  );
};
