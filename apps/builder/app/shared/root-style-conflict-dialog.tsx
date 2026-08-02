import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { hyphenateProperty, toValue } from "@webstudio-is/css-engine";
import type {
  RootStyleConflict,
  RootStyleConflictResolution,
} from "@webstudio-is/project-build/runtime";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";

export type RootStyleConflictDialogResult =
  | RootStyleConflictResolution
  | "cancel";
export type RootStyleConflictDialogConflict = Pick<
  RootStyleConflict,
  "existingStyle" | "incomingStyle"
> & { breakpointLabel: string };

const conflictResolutionOptions = [
  {
    value: "ours",
    label: "Keep existing",
    description: "Preserve your project's current global style values",
  },
  {
    value: "theirs",
    label: "Use incoming",
    description: "Replace conflicting global style values with pasted values",
  },
] as const satisfies ReadonlyArray<{
  value: RootStyleConflictResolution;
  label: string;
  description: string;
}>;

type DialogState =
  | {
      conflicts: RootStyleConflictDialogConflict[];
      resolution: RootStyleConflictResolution;
      resolve: (result: RootStyleConflictDialogResult) => void;
    }
  | undefined;

const $dialogState = atom<DialogState>(undefined);

export const showRootStyleConflictDialog = (
  conflicts: RootStyleConflictDialogConflict[]
): Promise<RootStyleConflictDialogResult> =>
  new Promise((resolve) => {
    $dialogState.get()?.resolve("cancel");
    $dialogState.set({ conflicts, resolution: "ours", resolve });
  });

export const RootStyleConflictDialog = () => {
  const dialogState = useStore($dialogState);
  if (dialogState === undefined) {
    return;
  }

  const { conflicts, resolution, resolve } = dialogState;
  const handleClose = () => {
    if ($dialogState.get()?.resolve === resolve) {
      $dialogState.set(undefined);
    }
  };
  const handleCancel = () => {
    resolve("cancel");
    handleClose();
  };
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <ConflictResolutionDialog
      title="Global style conflict detected"
      description={
        conflicts.length === 1
          ? "A pasted global style conflicts with an existing value. Global styles affect every page."
          : `${conflicts.length} pasted global styles conflict with existing values. Global styles affect every page.`
      }
      detailsLabel="Show conflicting styles"
      details={conflicts
        .map(({ existingStyle, incomingStyle, breakpointLabel }) => {
          const property = hyphenateProperty(incomingStyle.property);
          const state =
            incomingStyle.state === undefined ? "" : `, ${incomingStyle.state}`;
          return `${property} (${breakpointLabel}${state}): ${toValue(existingStyle.value)} → ${toValue(incomingStyle.value)}`;
        })
        .join("; ")}
      resolution={resolution}
      options={conflictResolutionOptions}
      onResolutionChange={(nextResolution) => {
        if ($dialogState.get()?.resolve === resolve) {
          $dialogState.set({
            conflicts,
            resolution: nextResolution,
            resolve,
          });
        }
      }}
      onResolve={() => {
        resolve(resolution);
        handleClose();
      }}
      onCancel={handleCancel}
    />
  );
};
