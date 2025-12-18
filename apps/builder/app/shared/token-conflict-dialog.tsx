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

export type ConflictResolution = "ours" | "theirs";

type ConflictState =
  | {
      conflicts: TokenConflict[];
      onResolve: (resolution: ConflictResolution) => void;
      onCancel: () => void;
    }
  | undefined;

const $tokenConflictState = atom<ConflictState>(undefined);

export const showTokenConflictDialog = (
  conflicts: TokenConflict[],
  onResolve: (resolution: ConflictResolution) => void,
  onCancel: () => void
) => {
  $tokenConflictState.set({
    conflicts,
    onResolve,
    onCancel,
  });
};

export const TokenConflictDialog = () => {
  const state = useStore($tokenConflictState);
  const [resolution, setResolution] = useState<ConflictResolution | undefined>(
    "theirs"
  );

  if (!state) {
    return null;
  }

  const { conflicts, onResolve, onCancel } = state;

  const handleClose = () => {
    $tokenConflictState.set(undefined);
    setResolution("theirs");
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
          onCancel();
          handleClose();
        }
      }}
    >
      <DialogContent css={{ minWidth: "30ch" }}>
        <DialogTitle>Token Conflict Detected</DialogTitle>
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
          <Button
            color="positive"
            onClick={() => {
              if (resolution) {
                onResolve(resolution);
                handleClose();
              }
            }}
          >
            Continue
          </Button>
          <Button
            color="ghost"
            onClick={() => {
              onCancel();
              handleClose();
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};
