import type { StyleProperty } from "@webstudio-is/css-engine";
import { parseTransition } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import type { StyleInfo } from "../../shared/style-info";

export const property: StyleProperty = "transition";

export const addTransition = (
  shadow: string,
  style: StyleInfo,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const parsedLayers = parseTransition(shadow);
  if (parsedLayers.type === "invalid") {
    return;
  }

  console.log(JSON.stringify(parsedLayers, null, 2));

  const layers = style[property]?.value;

  // Initially its none, so we can just set it.
  if (layers?.type === "layers") {
    // Adding layers we had before
    parsedLayers.value = [...parsedLayers.value, ...layers.value];
  }

  const batch = createBatchUpdate();
  batch.setProperty(property)(parsedLayers);
  batch.publish();
};
