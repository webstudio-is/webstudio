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
    if (visible.length !== initial.value.length) {
      continue;
    }
    const layers = [...value.value];
    let nextAssetIndex = 0;
    visible.forEach((storedLayer, index) => {
      const initialLayer = initial.value[index];
      if (
        storedLayer.type !== "image" ||
        storedLayer.value.type !== "asset" ||
        initialLayer.type !== "keyword" ||
        initialLayer.value !== "none"
      ) {
        return;
      }
      const assetIndex =
        index >= nextAssetIndex &&
        layers[index]?.type === "keyword" &&
        layers[index].value === "none"
          ? index
          : layers.findIndex(
              (layer, position) =>
                position >= nextAssetIndex &&
                layer.type === "keyword" &&
                layer.value === "none"
            );
      if (
        assetIndex >= 0 &&
        layers[assetIndex].type === "keyword" &&
        layers[assetIndex].value === "none"
      ) {
        layers[assetIndex] = storedLayer;
        nextAssetIndex = assetIndex + 1;
      }
    });
    original.value.forEach((layer, index) => {
      if (layer.hidden === true) {
        layers.splice(Math.min(index, layers.length), 0, layer);
      }
    });
    result.set(property, {
      ...value,
      value: layers,
    });
  }
  return result;
};
