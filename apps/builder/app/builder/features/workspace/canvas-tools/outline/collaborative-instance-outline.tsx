import { useStore } from "@nanostores/react";
import {
  $collaborativeInstanceOutlineAndInstance,
  $collaborativeInstanceSelector,
} from "~/shared/nano-states";
import { Outline } from "./outline";
import { applyScale } from "./apply-scale";
import { scaleStore } from "~/builder/shared/nano-states";

// Outline of an instance that is being edited by AI or a human collaborator.
export const CollaborativeInstanceOutline = () => {
  const selectedInstanceSelector = useStore($collaborativeInstanceSelector);
  const outline = useStore($collaborativeInstanceOutlineAndInstance);
  const scale = useStore(scaleStore);
  if (outline === undefined || selectedInstanceSelector === undefined) {
    return null;
  }
  const rect = applyScale(outline.rect, scale);
  return <Outline rect={rect}></Outline>;
};
