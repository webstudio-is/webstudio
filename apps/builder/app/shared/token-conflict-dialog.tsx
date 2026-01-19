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
import type { TokenConflict } from "./style-source-utils";

export type ConflictResolution = "ours" | "theirs" | "merge";

type DialogState =
  | {
      conflicts: TokenConflict[];
      resolve: (resolution: ConflictResolution) => void;
    }
  | undefined;

const $tokenConflictDialogState = atom<DialogState>(undefined);

export const showTokenConflictDialog = (
  conflicts: Array<{
    tokenName: string;
    fragmentTokenId: string;
  }>
): Promise<ConflictResolution> => {
  return new Promise((resolve) => {
    const fullConflicts: TokenConflict[] = conflicts.map((c) => ({
      tokenName: c.tokenName,
      fragmentTokenId: c.fragmentTokenId,
      fragmentToken: {
        type: "token" as const,
        id: c.fragmentTokenId,
        name: c.tokenName,
      },
      existingToken: {
        type: "token" as const,
        id: "existing",
        name: c.tokenName,
      },
    }));

    $tokenConflictDialogState.set({
      conflicts: fullConflicts,
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
    $tokenConflictDialogState.set(undefined);
    setResolution("theirs");
  };

  const handleResolve = () => {
    if (resolution) {
      resolve(resolution);
      handleClose();
    }
  };

  const handleCancel = () => {
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
              <Label>
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
                  <Radio value="theirs" />
                  <Flex direction="column" gap="1">
                    <Text variant="labels">Theirs</Text>
                    <Text color="subtle">
                      Keep incoming tokens with a suffix added to their names
                      (e.g., "primary-color-1")
                    </Text>
                  </Flex>
                </Flex>
              </Label>

              <Label>
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
                  <Radio value="ours" />
                  <Flex direction="column" gap="1">
                    <Text variant="labels">Ours</Text>
                    <Text color="subtle">
                      Discard incoming tokens and use your existing project
                      tokens instead
                    </Text>
                  </Flex>
                </Flex>
              </Label>

              <Label>
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
                  <Radio value="merge" />
                  <Flex direction="column" gap="1">
                    <Text variant="labels">Merge</Text>
                    <Text color="subtle">
                      Combine both into your existing token (incoming styles
                      override existing ones)
                    </Text>
                  </Flex>
                </Flex>
              </Label>
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
          <Button color="positive" onClick={handleResolve}>
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
