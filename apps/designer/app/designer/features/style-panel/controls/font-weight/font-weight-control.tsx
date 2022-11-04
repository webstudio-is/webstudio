import { Select } from "@webstudio-is/design-system";
import { FontWeight, fontWeights } from "@webstudio-is/fonts";
import { useMemo } from "react";
import { useAssets } from "~/designer/shared/assets";
import { getFinalValue } from "../../shared/get-final-value";
import type { ControlProps } from "../../style-sections";

const allFontWeightOptions = (
  Object.keys(fontWeights) as Array<FontWeight>
).map((weight) => ({
  label: `${fontWeights[weight].label} (${weight})`,
  name: weight,
}));

const useFontWeightOptions = (currentFamily: string) => {
  const { assets } = useAssets("font");

  const options = allFontWeightOptions.filter((option) => {
    return assets.find((asset) => {
      return (
        "meta" in asset &&
        "family" in asset.meta &&
        asset.meta.family === currentFamily &&
        String(asset.meta.weight) === option.name
      );
    });
  });

  return options.length === 0 ? allFontWeightOptions : options;
};

export const FontWeightControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  const family = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: "fontFamily",
  });

  const fontWeightOptions = useFontWeightOptions(String(family?.value));

  const [options, selectedOptionLabel] = useMemo(() => {
    const selectedOption = fontWeightOptions.find(
      (option) => option.name == value?.value
    );
    const options = fontWeightOptions.map((option) => option.label);
    return [options, selectedOption?.label];
  }, [value?.value, fontWeightOptions]);

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  return (
    <Select
      options={options}
      value={selectedOptionLabel}
      onChange={(label) => {
        const option = fontWeightOptions.find(
          (option) => option.label == label
        );
        if (option) {
          setValue(option.name);
        }
      }}
      ghost
      css={{
        // @todo this shouldn't be in design system by default
        gap: "calc($sizes$1 / 2)",
        paddingLeft: "calc($sizes$4 / 2)",
        height: "calc($sizes$5 + $sizes$1)",
        boxShadow: "inset 0 0 0 1px $colors$slate7",
        textTransform: "capitalize",
        fontWeight: "inherit",
        "&:hover": { background: "none" },
      }}
    />
  );
};
