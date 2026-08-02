import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import type {
  ConflictResolution,
  TokenConflict,
} from "@webstudio-is/project-build/runtime";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";

export type TokenConflictDialogResult = ConflictResolution | "cancel";
export type TokenConflictDialogConflict = Pick<TokenConflict, "tokenName">;

const conflictResolutionOptions = [
  {
    value: "theirs",
    label: "Theirs",
    description:
      'Keep incoming tokens with a suffix added to their names (e.g., "primary-color-1")',
  },
  {
    value: "ours",
    label: "Ours",
    description:
      "Discard incoming tokens and use your existing project tokens instead",
  },
  {
    value: "merge",
    label: "Merge",
    description:
      "Combine both into your existing token (incoming styles override existing ones)",
  },
] as const satisfies ReadonlyArray<{
  value: ConflictResolution;
  label: string;
  description: string;
}>;

type DialogState =
  | {
      conflicts: TokenConflictDialogConflict[];
      resolution: ConflictResolution;
      resolve: (result: TokenConflictDialogResult) => void;
    }
  | undefined;

const $dialogState = atom<DialogState>(undefined);

export const showTokenConflictDialog = (
  conflicts: TokenConflictDialogConflict[]
): Promise<TokenConflictDialogResult> =>
  new Promise((resolve) => {
    $dialogState.get()?.resolve("cancel");
    $dialogState.set({ conflicts, resolution: "theirs", resolve });
  });

export const TokenConflictDialog = () => {
  const dialogState = useStore($dialogState);

  if (!dialogState) {
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

  const conflictCount = conflicts.length;
  const firstConflict = conflicts[0];

  return (
    <ConflictResolutionDialog
      title="Token conflict detected"
      description={
        conflictCount === 1
          ? `The token "${firstConflict.tokenName}" already exists with different styles.`
          : `${conflictCount} tokens already exist with the same names but different styles.`
      }
      detailsLabel="Show conflicting tokens"
      details={conflicts.map((conflict) => conflict.tokenName).join(", ")}
      resolution={resolution}
      options={conflictResolutionOptions}
      onResolutionChange={(nextResolution) => {
        if ($dialogState.get()?.resolve === resolve) {
          $dialogState.set({ conflicts, resolution: nextResolution, resolve });
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
