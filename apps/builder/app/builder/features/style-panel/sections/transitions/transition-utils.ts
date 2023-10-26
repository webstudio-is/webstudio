import type { TupleValue } from "@webstudio-is/css-engine";

export const convertTupleToStringValue = (layer: TupleValue): string => {
  const transition: string[] = [];

  for (const item of Object.values(layer.value)) {
    if (item.type === "keyword") {
      transition.push(item.value);
    }

    if (item.type === "unit") {
      transition.push(`${item.value}${item.unit}`);
    }
  }

  return transition.join(" ");
};
