import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogActions,
  Button,
  Flex,
  Text,
  theme,
} from "@webstudio-is/design-system";
import type {
  ConflictResolution,
  TokenConflict,
} from "@webstudio-is/project-build/runtime";
import { DialogRadioOptions } from "./dialog-radio-options";

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

  const handleResolve = () => {
    resolve(resolution);
    handleClose();
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
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        }
      }}
    >
      <DialogContent css={{ minWidth: "40ch" }}>
        <DialogTitle>Token conflict detected</DialogTitle>
        <Flex
          direction="column"
          gap="2"
          css={{
            padding: theme.panel.padding,
          }}
        >
          <DialogDescription asChild>
            <Text as="p">
              {conflictCount === 1
                ? `The token "${firstConflict.tokenName}" already exists with different styles.`
                : `${conflictCount} tokens already exist with the same names but different styles.`}
            </Text>
          </DialogDescription>

          <DialogRadioOptions
            value={resolution}
            options={conflictResolutionOptions}
            onValueChange={(resolution) => {
              if ($dialogState.get()?.resolve === resolve) {
                $dialogState.set({ conflicts, resolution, resolve });
              }
            }}
          />

          <Flex as="details" direction="column" gap="1">
            <Text as="summary">Show conflicting tokens</Text>
            <Text
              color="subtle"
              css={{
                maxHeight: 150,
                overflow: "auto",
              }}
            >
              {conflicts.map((conflict) => conflict.tokenName).join(", ")}
            </Text>
          </Flex>
        </Flex>
        <DialogActions>
          <Button autoFocus color="positive" onClick={handleResolve}>
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
