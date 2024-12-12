import { useStore } from "@nanostores/react";
import { $collaborativeInstanceRect } from "~/shared/nano-states";
import { Outline } from "./outline";
import { applyScale } from "./apply-scale";
import { $scale, $clipRect } from "~/builder/shared/nano-states";
import { $ephemeralStyles } from "~/canvas/stores";

// Outline of an instance that is being edited by AI or a human collaborator.
export const CollaborativeInstanceOutline = () => {
  const scale = useStore($scale);
  const instanceRect = useStore($collaborativeInstanceRect);
  const ephemeralStyles = useStore($ephemeralStyles);
  const clipRect = useStore($clipRect);

  if (
    instanceRect === undefined ||
    ephemeralStyles.length !== 0 ||
    clipRect === undefined
  ) {
    return;
  }

  const rect = applyScale(instanceRect, scale);

  return (
    <Outline variant="collaboration" rect={rect} clipRect={clipRect}></Outline>
  );
};
