import { useStore } from "@nanostores/react";
import { $collaborativeInstanceRect } from "~/shared/nano-states";
import { Outline } from "./outline";
import { applyScale } from "./apply-scale";
import { $scale } from "~/builder/shared/nano-states";

// Outline of an instance that is being edited by AI or a human collaborator.
export const CollaborativeInstanceOutline = () => {
  const scale = useStore($scale);
  const instanceRect = useStore($collaborativeInstanceRect);

  if (instanceRect === undefined) {
    return null;
  }

  const rect = applyScale(instanceRect, scale);

  return <Outline variant="collaboration" rect={rect}></Outline>;
};
