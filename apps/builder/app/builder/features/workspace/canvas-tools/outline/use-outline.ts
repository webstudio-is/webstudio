import { useStore } from "@nanostores/react";
import type { Instance } from "@webstudio-is/sdk";
import type { Atom } from "nanostores";
import { scaleStore } from "~/builder/shared/nano-states";

export const useOutline = (
  outlineStore: Atom<{ instance: Instance; rect: DOMRect } | undefined>
) => {
  const outline = useStore(outlineStore);
  const scale = useStore(scaleStore);
  if (outline === undefined) {
    return;
  }
  // Calculate in the "scale" that is applied to the canvas
  const scaleFactor = scale / 100;
  const rect = {
    top: outline.rect.top * scaleFactor,
    left: outline.rect.left * scaleFactor,
    width: outline.rect.width * scaleFactor,
    height: outline.rect.height * scaleFactor,
  };
  return { instance: outline.instance, rect };
};
