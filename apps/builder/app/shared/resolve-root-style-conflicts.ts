import type { WebstudioFragment, WebstudioData } from "@webstudio-is/sdk";
import { detectFragmentRootStyleConflicts } from "@webstudio-is/project-build/runtime";
import { builderApi } from "./builder-api";

export const resolveRootStyleConflicts = async ({
  fragment,
  targetData,
}: {
  fragment: WebstudioFragment;
  targetData: WebstudioData;
}) => {
  const conflicts = detectFragmentRootStyleConflicts({ fragment, targetData });
  if (conflicts.length === 0) {
    return "theirs" as const;
  }
  return builderApi.showRootStyleConflictDialog(
    conflicts.map((conflict) => ({
      ...conflict,
      breakpointLabel:
        targetData.breakpoints.get(conflict.existingStyle.breakpointId)
          ?.label ?? conflict.existingStyle.breakpointId,
    }))
  );
};
