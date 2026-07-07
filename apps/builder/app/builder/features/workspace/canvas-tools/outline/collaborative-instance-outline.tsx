import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import {
  $collaborators,
  assignCollaboratorColors,
} from "@webstudio-is/sync-client";
import {
  $collaborativeInstanceRect,
  $collaborativeInstanceSelector,
  $selectedPageId,
} from "~/shared/nano-states";
import { Outline } from "./outline";
import { applyScale } from "../apply-scale";
import { $scale, $clampingRect } from "~/builder/shared/nano-states";
import { $ephemeralStyles } from "~/canvas/stores";

const areSelectorsEqual = (
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
) => {
  if (left === right) {
    return true;
  }
  if (
    left === undefined ||
    right === undefined ||
    left.length !== right.length
  ) {
    return false;
  }
  return left.every((id, index) => id === right[index]);
};

// Outline of an instance that is being edited by AI or a human collaborator.
export const CollaborativeInstanceOutline = () => {
  const scale = useStore($scale);
  const instanceRect = useStore($collaborativeInstanceRect);
  const collaborativeInstanceSelector = useStore(
    $collaborativeInstanceSelector
  );
  const collaborators = useStore($collaborators);
  const currentPageId = useStore($selectedPageId);
  const ephemeralStyles = useStore($ephemeralStyles);
  const clampingRect = useStore($clampingRect);
  const collaboratorColors = useMemo(
    () => assignCollaboratorColors(collaborators.keys()),
    [collaborators]
  );

  if (
    instanceRect === undefined ||
    ephemeralStyles.length !== 0 ||
    clampingRect === undefined
  ) {
    return;
  }

  const rect = applyScale(instanceRect, scale);

  const selectedCollaborator = [...collaborators.entries()].find(
    ([, collaborator]) => {
      if (
        currentPageId !== undefined &&
        collaborator.pageId !== undefined &&
        collaborator.pageId !== currentPageId
      ) {
        return false;
      }
      return areSelectorsEqual(
        collaborator.selectedInstanceIds,
        collaborativeInstanceSelector
      );
    }
  );

  const color =
    selectedCollaborator === undefined
      ? undefined
      : collaboratorColors.get(selectedCollaborator[0]);

  return (
    <Outline
      variant="default"
      rect={rect}
      clampingRect={clampingRect}
      color={color}
    ></Outline>
  );
};
