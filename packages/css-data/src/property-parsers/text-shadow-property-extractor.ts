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
  https://developer.mozilla.org/en-US/docs/Web/CSS/text-shadow#syntax

  To validate the text-shadow string value, should be used
  in combination with parseShadow function.

  Eg:
  extractBoxShadowProperties(parseShadow('boxShadow', "5em 5em 5em 5em #ffff"))
*/

export type ExtractedTextShadowProperties = {
  color: RgbValue | KeywordValue | null;
  offsetX: UnitValue | null;
  offsetY: UnitValue | null;
  blur: UnitValue | null;
};

export const extractTextShadowProperties = (
  shadow: TupleValue
): ExtractedTextShadowProperties => {
  let properties = [...shadow.value];
  let color: KeywordValue | RgbValue | null = null;

  properties = properties.filter(
    (prop: TupleValueItem): prop is KeywordValue => {
      if (prop.type === "keyword" || prop.type === "rgb") {
        color = prop;
        return false;
      }

      return true;
    }
  );

  const [offsetX, offsetY, blur] = properties.filter(
    (item): item is UnitValue => item.type === "unit"
  );

  return {
    color,
    offsetX: offsetX ?? null,
    offsetY: offsetY ?? null,
    blur: blur ?? null,
  };
};
