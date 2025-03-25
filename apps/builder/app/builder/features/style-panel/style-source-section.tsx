import { useState } from "react";
import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import { computed } from "nanostores";
import {
  type Instance,
  type StyleSource,
  type StyleSourceToken,
  type StyleSourceSelections,
  type StyleDecl,
  type StyleSources,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
import {
  Flex,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  Button,
  Text,
  theme,
} from "@webstudio-is/design-system";
import {
  type ItemSource,
  StyleSourceInput,
  type StyleSourceError,
} from "./style-source";
import {
  $registeredComponentMetas,
  $selectedInstanceStatesByStyleSourceId,
  $selectedInstanceStyleSources,
  $selectedOrLastStyleSourceSelector,
  $selectedStyleSources,
  $selectedStyleState,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/nano-states";
import { removeByMutable } from "~/shared/array-utils";
import { cloneStyles } from "~/shared/tree-utils";
import { serverSyncStore } from "~/shared/sync";
import { $selectedInstance } from "~/shared/awareness";

const selectStyleSource = (
  styleSourceId: StyleSource["id"],
  state?: StyleDecl["state"]
) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  const selectedStyleSources = new Map($selectedStyleSources.get());
  selectedStyleSources.set(instanceId, styleSourceId);
  $selectedStyleSources.set(selectedStyleSources);
  $selectedStyleState.set(state);
};

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

const getOrCreateStyleSourceSelectionMutable = (
  styleSourceSelections: StyleSourceSelections,
  selectedInstanceId: Instance["id"]
) => {
  let styleSourceSelection = styleSourceSelections.get(selectedInstanceId);
  if (styleSourceSelection === undefined) {
    styleSourceSelection = {
      instanceId: selectedInstanceId,
      values: [],
    };
    styleSourceSelections.set(selectedInstanceId, styleSourceSelection);
  }
  return styleSourceSelection;
};

const addStyleSourceToInstaceMutable = (
  styleSourceSelections: StyleSourceSelections,
  styleSources: StyleSources,
  instanceId: Instance["id"],
  newStyleSourceId: StyleSource["id"]
) => {
  const styleSourceSelection = getOrCreateStyleSourceSelectionMutable(
    styleSourceSelections,
    instanceId
  );
  if (styleSourceSelection.values.includes(newStyleSourceId) === false) {
    const lastStyleSourceId = styleSourceSelection.values.at(-1);
    const lastStyleSource =
      lastStyleSourceId === undefined
        ? undefined
        : styleSources.get(lastStyleSourceId);
    // when local style source exists insert before it
    if (lastStyleSource?.type === "local") {
      styleSourceSelection.values.splice(-1, 0, newStyleSourceId);
    } else {
      styleSourceSelection.values.push(newStyleSourceId);
    }
  }
};

const createStyleSource = (id: StyleSource["id"], name: string) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  const newStyleSource: StyleSource = {
    type: "token",
    id,
    name,
  };
  serverSyncStore.createTransaction(
    [$styleSources, $styleSourceSelections],
    (styleSources, styleSourceSelections) => {
      styleSources.set(newStyleSource.id, newStyleSource);
      addStyleSourceToInstaceMutable(
        styleSourceSelections,
        styleSources,
        instanceId,
        newStyleSource.id
      );
    }
  );
  selectStyleSource(newStyleSource.id);
};

export const addStyleSourceToInstance = (
  newStyleSourceId: StyleSource["id"]
) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  serverSyncStore.createTransaction(
    [$styleSourceSelections, $styleSources],
    (styleSourceSelections, styleSources) => {
      addStyleSourceToInstaceMutable(
        styleSourceSelections,
        styleSources,
        instanceId,
        newStyleSourceId
      );
    }
  );
  selectStyleSource(newStyleSourceId);
};

const removeStyleSourceFromInstance = (styleSourceId: StyleSource["id"]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  serverSyncStore.createTransaction(
    [$styleSourceSelections],
    (styleSourceSelections) => {
      const styleSourceSelection = styleSourceSelections.get(instanceId);
      if (styleSourceSelection === undefined) {
        return;
      }
      removeByMutable(
        styleSourceSelection.values,
        (item) => item === styleSourceId
      );
    }
  );
  // reset selected style source if necessary
  deselectMatchingStyleSource(styleSourceId);
};

const deleteStyleSource = (styleSourceId: StyleSource["id"]) => {
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

const duplicateStyleSource = (styleSourceId: StyleSource["id"]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  const styleSources = $styleSources.get();
  // style source may not exist in store which means
  // temporary generated local stye source was not applied yet
  const styleSource = styleSources.get(styleSourceId);
  if (styleSource === undefined || styleSource.type === "local") {
    return;
  }

  const newStyleSource: StyleSource = {
    type: "token",
    id: nanoid(),
    name: `${styleSource.name} (copy)`,
  };
  const clonedStyleSourceIds = new Map();
  clonedStyleSourceIds.set(styleSourceId, newStyleSource.id);
  const clonedStyles = cloneStyles($styles.get(), clonedStyleSourceIds);

  serverSyncStore.createTransaction(
    [$styleSources, $styles, $styleSourceSelections],
    (styleSources, styles, styleSourceSelections) => {
      const styleSourceSelection = styleSourceSelections.get(instanceId);
      if (styleSourceSelection === undefined) {
        return;
      }
      // put new style source after original one
      const position = styleSourceSelection.values.indexOf(styleSourceId);
      styleSourceSelection.values.splice(position + 1, 0, newStyleSource.id);
      styleSources.set(newStyleSource.id, newStyleSource);
      for (const styleDecl of clonedStyles) {
        styles.set(getStyleDeclKey(styleDecl), styleDecl);
      }
    }
  );

  selectStyleSource(newStyleSource.id);

  return newStyleSource.id;
};

const convertLocalStyleSourceToToken = (styleSourceId: StyleSource["id"]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  const newStyleSource: StyleSource = {
    type: "token",
    id: styleSourceId,
    name: "Local (Copy)",
  };
  serverSyncStore.createTransaction(
    [$styleSources, $styleSourceSelections],
    (styleSources, styleSourceSelections) => {
      const styleSourceSelection = getOrCreateStyleSourceSelectionMutable(
        styleSourceSelections,
        instanceId
      );
      // generated local style source was not applied so put last
      if (styleSourceSelection.values.includes(newStyleSource.id) === false) {
        styleSourceSelection.values.push(newStyleSource.id);
      }
      styleSources.set(newStyleSource.id, newStyleSource);
    }
  );
  selectStyleSource(newStyleSource.id);
};

const reorderStyleSources = (styleSourceIds: StyleSource["id"][]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  serverSyncStore.createTransaction(
    [$styleSourceSelections],
    (styleSourceSelections) => {
      const styleSourceSelection = styleSourceSelections.get(instanceId);
      if (styleSourceSelection === undefined) {
        return;
      }
      styleSourceSelection.values = styleSourceIds;
    }
  );
};

const renameStyleSource = (
  id: StyleSource["id"],
  name: string
): StyleSourceError | undefined => {
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

const clearStyles = (styleSourceId: StyleSource["id"]) => {
  serverSyncStore.createTransaction([$styles], (styles) => {
    for (const [styleDeclKey, styleDecl] of styles) {
      if (styleDecl.styleSourceId === styleSourceId) {
        styles.delete(styleDeclKey);
      }
    }
  });
};

const $componentStates = computed(
  [$selectedInstance, $registeredComponentMetas],
  (selectedInstance, registeredComponentMetas) => {
    if (selectedInstance === undefined) {
      return;
    }
    return registeredComponentMetas.get(selectedInstance.component)?.states;
  }
);

type StyleSourceInputItem = {
  id: StyleSource["id"];
  label: string;
  disabled: boolean;
  source: ItemSource;
  states: string[];
};

const convertToInputItem = (
  styleSource: StyleSource,
  states: string[]
): StyleSourceInputItem => {
  return {
    id: styleSource.id,
    label: styleSource.type === "local" ? "Local" : styleSource.name,
    disabled: false,
    source: styleSource.type,
    states,
  };
};

/**
 * find all non-local and component style sources
 */
const $availableStyleSources = computed([$styleSources], (styleSources) => {
  const availableStylesSources: StyleSourceInputItem[] = [];
  for (const styleSource of styleSources.values()) {
    if (styleSource.type === "local") {
      continue;
    }
    availableStylesSources.push(convertToInputItem(styleSource, []));
  }
  return availableStylesSources;
});

export const StyleSourcesSection = () => {
  const componentStates = useStore($componentStates);
  const availableStyleSources = useStore($availableStyleSources);
  const selectedInstanceStyleSources = useStore($selectedInstanceStyleSources);
  const selectedInstanceStatesByStyleSourceId = useStore(
    $selectedInstanceStatesByStyleSourceId
  );
  const value = selectedInstanceStyleSources.map((styleSource) =>
    convertToInputItem(
      styleSource,
      selectedInstanceStatesByStyleSourceId.get(styleSource.id) ?? []
    )
  );
  const selectedOrLastStyleSourceSelector = useStore(
    $selectedOrLastStyleSourceSelector
  );

  const [editingItemId, setEditingItemId] = useState<StyleSource["id"]>();

  const [tokenToDelete, setTokenToDelete] = useState<StyleSourceToken>();
  const [error, setError] = useState<StyleSourceError>();

  const setEditingItem = (id?: StyleSource["id"]) => {
    // User finished editing or started editing a different token
    if (error && (id === undefined || id !== error.id)) {
      setError(undefined);
    }
    setEditingItemId(id);
  };

  return (
    <>
      <StyleSourceInput
        error={error}
        items={availableStyleSources}
        value={value}
        selectedItemSelector={selectedOrLastStyleSourceSelector}
        componentStates={componentStates}
        onCreateItem={createStyleSource}
        onSelectAutocompleteItem={({ id }) => {
          addStyleSourceToInstance(id);
        }}
        onDuplicateItem={(id) => {
          const newId = duplicateStyleSource(id);
          if (newId !== undefined) {
            setEditingItem(newId);
          }
        }}
        onConvertToToken={(id) => {
          convertLocalStyleSourceToToken(id);
          setEditingItem(id);
        }}
        onClearStyles={clearStyles}
        onDetachItem={(id) => {
          removeStyleSourceFromInstance(id);
        }}
        onDeleteItem={(id) => {
          const styleSources = $styleSources.get();
          const token = styleSources.get(id);
          if (token?.type === "token") {
            setTokenToDelete(token);
          }
        }}
        onSort={(items) => {
          reorderStyleSources(items.map((item) => item.id));
        }}
        onSelectItem={(styleSourceSelector) => {
          selectStyleSource(
            styleSourceSelector.styleSourceId,
            styleSourceSelector.state
          );
        }}
        // style source renaming
        editingItemId={editingItemId}
        onEditItem={(id) => {
          setEditingItem(id);
          // prevent deselect after renaming
          if (id !== undefined) {
            selectStyleSource(id);
          }
        }}
        onChangeItem={(item) => {
          const error = renameStyleSource(item.id, item.label);
          if (error) {
            setError(error);
            setEditingItem(item.id);
            return;
          }
          setError(undefined);
        }}
      />
      <DeleteConfirmationDialog
        token={tokenToDelete?.name}
        onClose={() => {
          setTokenToDelete(undefined);
        }}
        onConfirm={() => {
          if (tokenToDelete) {
            deleteStyleSource(tokenToDelete.id);
          }
        }}
      />
    </>
  );
};

type DeleteConfirmationDialogProps = {
  onClose: () => void;
  onConfirm: () => void;
  token?: string;
};

const DeleteConfirmationDialog = ({
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
      <DialogContent>
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
