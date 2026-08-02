import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { hyphenateProperty } from "@webstudio-is/css-engine";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Flex,
  Text,
  theme,
} from "@webstudio-is/design-system";
import type {
  RootStyleConflict,
  RootStyleConflictResolution,
} from "@webstudio-is/project-build/runtime";
import { DialogRadioOptions } from "./dialog-radio-options";

export type RootStyleConflictDialogResult =
  | RootStyleConflictResolution
  | "cancel";
export type RootStyleConflictDialogConflict = Pick<
  RootStyleConflict,
  "incomingStyle"
>;

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
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (open === false) {
          handleCancel();
        }
      }}
    >
      <DialogContent css={{ minWidth: "40ch" }}>
        <DialogTitle>Global style conflict detected</DialogTitle>
        <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
          <DialogDescription asChild>
            <Text as="p">
              {conflicts.length === 1
                ? "A pasted global style conflicts with an existing value. Global styles affect every page."
                : `${conflicts.length} pasted global styles conflict with existing values. Global styles affect every page.`}
            </Text>
          </DialogDescription>

          <DialogRadioOptions
            value={resolution}
            options={conflictResolutionOptions}
            onValueChange={(nextResolution) => {
              if ($dialogState.get()?.resolve === resolve) {
                $dialogState.set({
                  conflicts,
                  resolution: nextResolution,
                  resolve,
                });
              }
            }}
          />

          <Flex as="details" direction="column" gap="1">
            <Text as="summary">Show conflicting styles</Text>
            <Text color="subtle" css={{ maxHeight: 150, overflow: "auto" }}>
              {conflicts
                .map(({ incomingStyle }) => {
                  const property = hyphenateProperty(incomingStyle.property);
                  return incomingStyle.state === undefined
                    ? property
                    : `${property} (${incomingStyle.state})`;
                })
                .join(", ")}
            </Text>
          </Flex>
        </Flex>
        <DialogActions>
          <Button
            autoFocus
            color="positive"
            onClick={() => {
              resolve(resolution);
              handleClose();
            }}
          >
            Continue
          </Button>
          <Button color="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};
