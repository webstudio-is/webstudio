import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  Button,
  Text,
  Flex,
  theme,
} from "@webstudio-is/design-system";
import type { StyleSource } from "@webstudio-is/sdk";
import {
  $styleSources,
  $styleSourceSelections,
  $styles,
  $selectedStyleSources,
  $selectedStyleState,
} from "~/shared/nano-states";
import { removeByMutable } from "~/shared/array-utils";
import { serverSyncStore } from "~/shared/sync";
import { $selectedInstance } from "~/shared/awareness";

const deselectMatchingStyleSource = (styleSourceId: StyleSource["id"]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  const selectedStyleSources = new Map($selectedStyleSources.get());
  if (selectedStyleSources.get(instanceId) === styleSourceId) {
    selectedStyleSources.delete(instanceId);
    $selectedStyleSources.set(selectedStyleSources);
    $selectedStyleState.set(undefined);
  }
};

export const deleteStyleSource = (styleSourceId: StyleSource["id"]) => {
  serverSyncStore.createTransaction(
    [$styleSources, $styleSourceSelections, $styles],
    (styleSources, styleSourceSelections, styles) => {
      styleSources.delete(styleSourceId);
      for (const styleSourceSelection of styleSourceSelections.values()) {
        if (styleSourceSelection.values.includes(styleSourceId)) {
          removeByMutable(
            styleSourceSelection.values,
            (item) => item === styleSourceId
          );
        }
      }
      for (const [styleDeclKey, styleDecl] of styles) {
        if (styleDecl.styleSourceId === styleSourceId) {
          styles.delete(styleDeclKey);
        }
      }
    }
  );
  // reset selected style source if necessary
  deselectMatchingStyleSource(styleSourceId);
};

export type RenameTokenError =
  | { type: "minlength"; id: StyleSource["id"] }
  | { type: "duplicate"; id: StyleSource["id"] };

export const renameToken = (
  id: StyleSource["id"],
  name: string
): RenameTokenError | undefined => {
  const styleSources = $styleSources.get();
  if (name.trim().length === 0) {
    return { type: "minlength", id };
  }
  for (const styleSource of styleSources.values()) {
    if (
      styleSource.type === "token" &&
      styleSource.name === name &&
      styleSource.id !== id
    ) {
      return { type: "duplicate", id };
    }
  }
  serverSyncStore.createTransaction([$styleSources], (styleSources) => {
    const styleSource = styleSources.get(id);
    if (styleSource?.type === "token") {
      styleSource.name = name;
    }
  });
};

type DeleteConfirmationDialogProps = {
  onClose: () => void;
  onConfirm: () => void;
  token?: string;
};

export const DeleteConfirmationDialog = ({
  onClose,
  onConfirm,
  token,
}: DeleteConfirmationDialogProps) => {
  return (
    <Dialog
      open={token !== undefined}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          // Prevent command panel from handling keyboard events
          event.stopPropagation();
        }}
      >
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>{`Delete "${token}" token from the project including all of its styles?`}</Text>
          <Flex direction="rowReverse" gap="2">
            <DialogClose>
              <Button
                color="destructive"
                onClick={() => {
                  onConfirm();
                }}
              >
                Delete
              </Button>
            </DialogClose>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
        <DialogTitle>Delete confirmation</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
