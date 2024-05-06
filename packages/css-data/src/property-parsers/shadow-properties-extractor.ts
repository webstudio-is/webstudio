import type {
  KeywordValue,
  RgbValue,
  TupleValue,
  TupleValueItem,
  UnitValue,
} from "@webstudio-is/css-engine";

/*
  extractBoxShadowProperties accepts a TupleValue
  and just tokenizes the valuess of box-shadow items.
  https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow#syntax

  To validate the box-shadow string value, should be used
  in combination with parseShadow function.

  Eg:
  extractBoxShadowProperties(parseShadow('boxShadow', "5em 5em 5em 5em #ffff"))
*/

export type ExtractedShadowProperties = {
  inset?: KeywordValue | undefined;
  color?: RgbValue | KeywordValue | undefined;
  offsetX: UnitValue;
  offsetY: UnitValue;
  blur: UnitValue;
  spread: UnitValue;
};

export const extractShadowProperties = (
  shadow: TupleValue
): ExtractedShadowProperties => {
  let properties = [...shadow.value];
  let inset: KeywordValue | undefined = undefined;
  let color: KeywordValue | RgbValue | undefined = undefined;

  properties = properties.filter(
    (prop: TupleValueItem): prop is KeywordValue => {
      if (prop.type === "keyword" && prop.value === "inset") {
        inset = prop;
        return false;
      }

      if (prop.type === "keyword" || prop.type === "rgb") {
        color = prop;
        return false;
      }

      return true;
    }
  );

  const [offsetX, offsetY, blur, spread] = properties.filter(
    (item): item is UnitValue => item.type === "unit"
  );

  return {
    ...(color !== undefined && { color }),
    ...(inset !== undefined && { inset }),
    offsetX,
    offsetY,
    blur,
    spread,
  };
};
