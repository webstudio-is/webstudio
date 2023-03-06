import type { ControlProps } from "../../style-sections";
import { styleConfigByName } from "../../shared/configs";
import { getStyleSource } from "../../shared/style-info";
import { CssValueInputContainer } from "../../shared/css-value-input";

export const TextControl = ({
  property,
  items,
  currentStyle,
  setProperty,
  deleteProperty,
  icon,
}: ControlProps & { icon?: JSX.Element }) => {
  const { label, items: defaultItems } = styleConfigByName[property];
  const styleInfo = currentStyle[property];
  const value = styleInfo?.value;
  const styleSource = getStyleSource(styleInfo);
  const keywords = (items ?? defaultItems).map((item) => ({
    type: "keyword" as const,
    value: item.name,
  }));
  const setValue = setProperty(property);

  return (
    <CssValueInputContainer
      label={label}
      property={property}
      styleSource={styleSource}
      keywords={keywords}
      value={value}
      setValue={setValue}
      deleteProperty={deleteProperty}
    />
  );
};
