import type { CssStyleMap } from "@webstudio-is/css-engine";

export const preserveAssetLayers = (
  stored: CssStyleMap,
  initiallyParsed: CssStyleMap,
  edited: CssStyleMap
) => {
  const result = new Map(edited);
  for (const [property, value] of edited) {
    const original = stored.get(property);
    const initial = initiallyParsed.get(property);
    if (
      original?.type !== "layers" ||
      initial?.type !== "layers" ||
      value.type !== "layers"
    ) {
      continue;
    }
    const visible = original.value.filter((layer) => layer.hidden !== true);
    if (
      visible.length !== initial.value.length ||
      visible.length !== value.value.length
    ) {
      continue;
    }
    let index = 0;
    result.set(property, {
      ...value,
      value: original.value.map((storedLayer) => {
        if (storedLayer.hidden === true) {
          return storedLayer;
        }
        const initialLayer = initial.value[index];
        const layer = value.value[index++];
        return storedLayer.type === "image" &&
          storedLayer.value.type === "asset" &&
          initialLayer.type === "keyword" &&
          initialLayer.value === "none" &&
          layer.type === "keyword" &&
          layer.value === "none"
          ? storedLayer
          : layer;
      }),
    });
  }
  return result;
};
