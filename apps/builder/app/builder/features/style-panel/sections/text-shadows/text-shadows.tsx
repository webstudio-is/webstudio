import { colord, type RgbaColor } from "colord";
import {
  toValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { RepeatedStyleSection } from "../../shared/style-section";
import { ShadowContent } from "../../shared/shadow-content";
import {
  addRepeatedStyleItem,
  editRepeatedStyleItem,
  RepeatedStyle,
} from "../../shared/repeated-style";
import { parseCssFragment } from "../../shared/parse-css-fragment";
import { useComputedStyleDecl } from "../../shared/model";

export const properties = ["textShadow"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Text Shadows";
const initialTextShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";

const getItemProps = (_index: number, layer: StyleValue) => {
  const values = layer.type === "tuple" ? layer.value : [];
  const labels = ["Text Shadow:"];
  let color: RgbaColor | undefined;

  for (const item of values) {
    if (item.type === "rgb") {
      color = colord(toValue(item)).toRgb();
      continue;
    }
    if (item.type === "keyword" && colord(item.value).isValid()) {
      color = colord(item.value).toRgb();
      continue;
    }
    labels.push(toValue(item));
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
          parseCssFragment(initialTextShadow, "textShadow")
        );
      }}
    >
      <RepeatedStyle
        label={label}
        styles={[styleDecl]}
        getItemProps={getItemProps}
        renderItemContent={(index, value) => (
          <ShadowContent
            index={index}
            layer={value}
            property={property}
            propertyValue={toValue(value)}
            onEditLayer={(index, value, options) => {
              editRepeatedStyleItem(
                [styleDecl],
                index,
                new Map([["textShadow", value]]),
                options
              );
            }}
          />
        )}
      />
    </RepeatedStyleSection>
  );
};
