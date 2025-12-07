import { useState, useEffect } from "react";
import { atom, computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  Button,
  Text,
  Flex,
  theme,
  InputField,
  toast,
} from "@webstudio-is/design-system";
import type { Instance, StyleSource } from "@webstudio-is/sdk";
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

const $isDeleteUnusedTokensDialogOpen = atom(false);

export const openDeleteUnusedTokensDialog = () => {
  $isDeleteUnusedTokensDialogOpen.set(true);
};

export const $styleSourceUsages = computed(
  $styleSourceSelections,
  (styleSourceSelections) => {
    const styleSourceUsages = new Map<StyleSource["id"], Set<Instance["id"]>>();
    for (const { instanceId, values } of styleSourceSelections.values()) {
      for (const styleSourceId of values) {
        let usages = styleSourceUsages.get(styleSourceId);
        if (usages === undefined) {
          usages = new Set();
          styleSourceUsages.set(styleSourceId, usages);
        }
        usages.add(instanceId);
      }
    }
    return styleSourceUsages;
  }
);

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

export const deleteUnusedTokens = () => {
  const styleSources = $styleSources.get();
  const styleSourceUsages = $styleSourceUsages.get();
  const unusedTokenIds: StyleSource["id"][] = [];

  for (const styleSource of styleSources.values()) {
    if (styleSource.type === "token") {
      const usages = styleSourceUsages.get(styleSource.id);
      if (usages === undefined || usages.size === 0) {
        unusedTokenIds.push(styleSource.id);
      }
    }
  }

  if (unusedTokenIds.length === 0) {
    return 0;
  }

  serverSyncStore.createTransaction(
    [$styleSources, $styleSourceSelections, $styles],
    (styleSources, styleSourceSelections, styles) => {
      for (const styleSourceId of unusedTokenIds) {
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
    }
  );

  return unusedTokenIds.length;
};

export type RenameStyleSourceError =
  | { type: "minlength"; id: StyleSource["id"] }
  | { type: "duplicate"; id: StyleSource["id"] };

export const renameStyleSource = (
  id: StyleSource["id"],
  name: string
): RenameStyleSourceError | undefined => {
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

type DeleteStyleSourceDialogProps = {
  styleSource?: { id: StyleSource["id"]; name: string };
  onClose: () => void;
  onConfirm: (styleSourceId: StyleSource["id"]) => void;
};

export const DeleteStyleSourceDialog = ({
  styleSource,
  onClose,
  onConfirm,
}: DeleteStyleSourceDialogProps) => {
  return (
    <Dialog
      open={styleSource !== undefined}
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
        <DialogTitle>Delete confirmation</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>{`Delete "${styleSource?.name}" token from the project including all of its styles?`}</Text>
          <Flex direction="rowReverse" gap="2">
            <Button
              color="destructive"
              onClick={() => {
                onConfirm(styleSource!.id);
                onClose();
              }}
            >
              Delete
            </Button>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};

type RenameStyleSourceDialogProps = {
  styleSource?: { id: StyleSource["id"]; name: string };
  onClose: () => void;
  onConfirm: (styleSourceId: StyleSource["id"], newName: string) => void;
};

export const RenameStyleSourceDialog = ({
  styleSource,
  onClose,
  onConfirm,
}: RenameStyleSourceDialogProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  // Reset name and clear error when styleSource changes
  useEffect(() => {
    if (styleSource?.name !== undefined) {
      setName(styleSource.name);
      setError(undefined);
    }
  }, [styleSource?.id, styleSource?.name]);

  const handleConfirm = () => {
    const renameError = renameStyleSource(styleSource!.id, name);
    if (renameError) {
      if (renameError.type === "minlength") {
        setError("Token name cannot be empty");
      } else if (renameError.type === "duplicate") {
        setError("A token with this name already exists");
      }
      return;
    }
    onConfirm(styleSource!.id, name);
    onClose();
  };

  return (
    <Dialog
      open={styleSource !== undefined}
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
          if (event.key === "Enter" && !error) {
            handleConfirm();
          }
        }}
      >
        <DialogTitle>Rename Token</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Flex direction="column" gap="1">
            <InputField
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(undefined);
              }}
              color={error ? "error" : undefined}
            />
            {error && (
              <Text color="destructive" variant="monoBold">
                {error}
              </Text>
            )}
          </Flex>
          <Flex direction="rowReverse" gap="2">
            <Button color="primary" onClick={handleConfirm}>
              Rename
            </Button>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteUnusedTokensDialog = () => {
  const open = useStore($isDeleteUnusedTokensDialogOpen);
  const styleSourceUsages = useStore($styleSourceUsages);
  const styleSources = useStore($styleSources);

  const handleClose = () => {
    $isDeleteUnusedTokensDialogOpen.set(false);
  };

  const unusedTokens: Array<{ id: string; name: string }> = [];
  for (const styleSource of styleSources.values()) {
    if (styleSource.type === "token") {
      const usages = styleSourceUsages.get(styleSource.id);
      if (usages === undefined || usages.size === 0) {
        unusedTokens.push({ id: styleSource.id, name: styleSource.name });
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          handleClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <DialogTitle>Delete unused tokens</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          {unusedTokens.length === 0 ? (
            <Text>There are no unused tokens to delete.</Text>
          ) : (
            <>
              <Text>
                Delete {unusedTokens.length} unused{" "}
                {unusedTokens.length === 1 ? "token" : "tokens"} from the
                project?
              </Text>
              <Text
                variant="mono"
                css={{
                  maxHeight: 200,
                  overflowY: "auto",
                  backgroundColor: theme.colors.backgroundPanel,
                  borderRadius: theme.borderRadius[4],
                  wordBreak: "break-word",
                }}
              >
                {unusedTokens.map((token) => token.name).join(", ")}
              </Text>
            </>
          )}
          <Flex direction="rowReverse" gap="2">
            {unusedTokens.length > 0 && (
              <Button
                color="destructive"
                onClick={() => {
                  const deletedCount = deleteUnusedTokens();
                  handleClose();
                  if (deletedCount === 0) {
                    toast.info("No unused tokens to delete");
                  } else {
                    toast.success(
                      `Deleted ${deletedCount} unused ${deletedCount === 1 ? "token" : "tokens"}`
                    );
                  }
                }}
              >
                Delete
              </Button>
            )}
            <DialogClose>
              <Button color="ghost">
                {unusedTokens.length > 0 ? "Cancel" : "Close"}
              </Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};
