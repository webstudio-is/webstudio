import { useState } from "react";
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

export type ConflictResolution = "ours" | "theirs";

// Track the current dialog state setter
let currentSetDialogState:
  | ((
      state:
        | {
            conflicts: TokenConflict[];
            resolve: (resolution: ConflictResolution) => void;
          }
        | undefined
    ) => void)
  | undefined;

export const showTokenConflictDialog = (
  conflicts: Array<{
    tokenName: string;
    fragmentTokenId: string;
  }>
): Promise<ConflictResolution> => {
  return new Promise((resolve) => {
    if (!currentSetDialogState) {
      throw new Error("TokenConflictDialog not mounted");
    }

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

    currentSetDialogState({
      conflicts: fullConflicts,
      resolve,
    });
  });
};

export const TokenConflictDialog = () => {
  const [dialogState, setDialogState] = useState<
    | {
        conflicts: TokenConflict[];
        resolve: (resolution: ConflictResolution) => void;
      }
    | undefined
  >();
  const [resolution, setResolution] = useState<ConflictResolution | undefined>(
    "theirs"
  );

  // Register the setDialogState function
  currentSetDialogState = setDialogState;

  if (!dialogState) {
    return;
  }

  const { conflicts, resolve } = dialogState;

  const handleClose = () => {
    setDialogState(undefined);
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
      <DialogContent css={{ minWidth: "30ch" }}>
        <DialogTitle>Token conflict detected</DialogTitle>
        <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
          <DialogDescription asChild>
            <Text as="p">
              {conflictCount === 1
                ? `The token "${firstConflict.tokenName}" already exists with different styles.`
                : `${conflictCount} tokens already exist with the same names but different styles.`}
            </Text>
          </DialogDescription>
          <Text color="subtle">
            Choose "theirs" to keep the incoming tokens (renamed with suffix) or
            "ours" to use your existing project tokens.
          </Text>
        </Flex>

        <RadioGroup
          value={resolution}
          onValueChange={(value) => setResolution(value as ConflictResolution)}
        >
          <Flex
            gap="3"
            css={{
              paddingInline: theme.panel.paddingInline,
              paddingBottom: theme.spacing[5],
            }}
          >
            <Label>
              <Flex
                gap="2"
                align="center"
                css={{
                  padding: theme.spacing[3],
                  cursor: "pointer",
                }}
              >
                <Radio value="theirs" />
                <Text>Theirs</Text>
              </Flex>
            </Label>

            <Label>
              <Flex
                gap="2"
                align="center"
                css={{
                  padding: theme.spacing[3],
                  cursor: "pointer",
                }}
              >
                <Radio value="ours" />
                <Text>Ours</Text>
              </Flex>
            </Label>
          </Flex>
        </RadioGroup>

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
