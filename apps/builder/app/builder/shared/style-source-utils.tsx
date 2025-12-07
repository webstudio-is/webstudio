import { useState, useEffect } from "react";
import { computed } from "nanostores";
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
  const [shouldFocus, setShouldFocus] = useState(false);

  // Reset name and clear error when styleSource changes
  useEffect(() => {
    if (styleSource?.name !== undefined) {
      setName(styleSource.name);
      setError(undefined);
      // Delay focus to ensure dialog is fully rendered
      setShouldFocus(false);
      const timer = setTimeout(() => setShouldFocus(true), 0);
      return () => clearTimeout(timer);
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
              autoFocus={shouldFocus}
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
