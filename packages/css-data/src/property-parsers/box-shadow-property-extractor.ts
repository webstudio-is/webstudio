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

  To validate the box-shadow string value, should be used
  in combination with parseBoxShadow

  Eg:
  extractBoxShadowProperties(parseBoxShadow("5em 5em 5em 5em #ffff"))
*/

export const extractBoxShadowProperties = (
  shadow: TupleValue
): {
  inset: KeywordValue | null;
  color: RgbValue | KeywordValue | null;
  offsetX: UnitValue | null;
  offsetY: UnitValue | null;
  blur: UnitValue | null;
  spread: UnitValue | null;
} => {
  let properties = [...shadow.value];
  let inset: KeywordValue | null = null;
  let color: KeywordValue | RgbValue | null = null;

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
    color,
    inset,
    offsetX: offsetX ?? null,
    offsetY: offsetY ?? null,
    blur: blur ?? null,
    spread: spread ?? null,
  };
};
