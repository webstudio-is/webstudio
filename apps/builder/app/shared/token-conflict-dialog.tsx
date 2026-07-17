import { useState } from "react";
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
  RadioGroup,
  Radio,
  Label,
} from "@webstudio-is/design-system";
import type {
  ConflictResolution,
  TokenConflict,
} from "@webstudio-is/project-build/runtime";

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
      resolve: (resolution: TokenConflictDialogResult) => void;
    }
  | undefined;

const $tokenConflictDialogState = atom<DialogState>(undefined);

export const showTokenConflictDialog = (
  conflicts: TokenConflictDialogConflict[]
): Promise<TokenConflictDialogResult> => {
  return new Promise((resolve) => {
    $tokenConflictDialogState.get()?.resolve("cancel");
    $tokenConflictDialogState.set({
      conflicts,
      resolve,
    });
  });
};

export const TokenConflictDialog = () => {
  const dialogState = useStore($tokenConflictDialogState);
  const [resolution, setResolution] = useState<ConflictResolution | undefined>(
    "theirs"
  );

  if (!dialogState) {
    return;
  }

  const { conflicts, resolve } = dialogState;

  const handleClose = () => {
    if ($tokenConflictDialogState.get()?.resolve === resolve) {
      $tokenConflictDialogState.set(undefined);
    }
    setResolution("theirs");
  };

  const handleResolve = () => {
    if (resolution) {
      resolve(resolution);
      handleClose();
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

          <RadioGroup
            value={resolution}
            onValueChange={(value) =>
              setResolution(value as ConflictResolution)
            }
          >
            <Flex direction="column" gap="1">
              {conflictResolutionOptions.map((option) => (
                <Label key={option.value}>
                  <Flex
                    gap="2"
                    css={{
                      padding: theme.spacing[3],
                      cursor: "pointer",
                      borderRadius: theme.borderRadius[4],
                      "&:hover": {
                        backgroundColor: theme.colors.backgroundHover,
                      },
                    }}
                  >
                    <Radio value={option.value} />
                    <Flex direction="column" gap="1">
                      <Text variant="labels">{option.label}</Text>
                      <Text color="subtle">{option.description}</Text>
                    </Flex>
                  </Flex>
                </Label>
              ))}
            </Flex>
          </RadioGroup>

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
