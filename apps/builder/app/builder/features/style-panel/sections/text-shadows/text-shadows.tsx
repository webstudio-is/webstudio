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

const label = "Text shadows";
const initialTextShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";

const getItemProps = (layer: StyleValue, computedLayer?: StyleValue) => {
  const shadowValue =
    computedLayer?.type === "shadow" ? computedLayer : undefined;
  const labels = [];
  if (layer.type === "var") {
    labels.push(`--${layer.value}`);
  } else if (shadowValue) {
    labels.push(toValue(shadowValue.offsetX));
    labels.push(toValue(shadowValue.offsetY));
    labels.push(toValue(shadowValue.blur));
  } else {
    labels.push(toValue(shadowValue));
  }
  const color = shadowValue?.color ? toValue(shadowValue.color) : undefined;
  return { label: labels.join(" "), color };
};

export const Section = () => {
  const styleDecl = useComputedStyleDecl("text-shadow");

  return (
    <RepeatedStyleSection
      label={label}
      description="Adds shadow effects around a text."
      properties={properties}
      onAdd={() => {
        addRepeatedStyleItem(
          [styleDecl],
          parseCssFragment(initialTextShadow, ["text-shadow"])
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
