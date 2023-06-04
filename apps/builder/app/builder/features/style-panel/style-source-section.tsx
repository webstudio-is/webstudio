import { useState } from "react";
import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import { computed } from "nanostores";
import store from "immerhin";
import {
  type Instance,
  type StyleSource,
  type StyleSourceToken,
  type StyleSourceSelections,
  getStyleDeclKey,
} from "@webstudio-is/project-build";
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
import { type ItemSource, StyleSourceInput } from "./style-source";
import {
  availableStyleSourcesStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedInstanceStatesByStyleSourceIdStore,
  selectedInstanceStore,
  selectedInstanceStyleSourcesStore,
  selectedOrLastStyleSourceSelectorStore,
  selectedStyleSourceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
} from "~/shared/nano-states";
import { removeByMutable } from "~/shared/array-utils";
import { cloneStyles } from "~/shared/tree-utils";

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

const createLocalStyleSourceIfNotExists = (
  styleSourceId: StyleSource["id"]
) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const [selectedInstanceId] = selectedInstanceSelector;
  store.createTransaction(
    [styleSourceSelectionsStore, styleSourcesStore],
    (styleSourceSelections, styleSources) => {
      const styleSourceSelection = getOrCreateStyleSourceSelectionMutable(
        styleSourceSelections,
        selectedInstanceId
      );
      if (styleSourceSelection.values.includes(styleSourceId) === false) {
        // local should be put first by default
        styleSourceSelection.values.unshift(styleSourceId);
      }
      if (styleSources.has(styleSourceId) === false) {
        styleSources.set(styleSourceId, {
          type: "local",
          id: styleSourceId,
        });
      }
    }
  );
};

const createStyleSource = (name: string) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const [selectedInstanceId] = selectedInstanceSelector;
  const newStyleSource: StyleSource = {
    type: "token",
    id: nanoid(),
    name,
  };
  store.createTransaction(
    [styleSourcesStore, styleSourceSelectionsStore],
    (styleSources, styleSourceSelections) => {
      const styleSourceSelection = getOrCreateStyleSourceSelectionMutable(
        styleSourceSelections,
        selectedInstanceId
      );
      styleSourceSelection.values.push(newStyleSource.id);
      styleSources.set(newStyleSource.id, newStyleSource);
    }
  );
  selectedStyleSourceSelectorStore.set({ styleSourceId: newStyleSource.id });
};

const addStyleSourceToInstace = (newStyleSourceId: StyleSource["id"]) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const [selectedInstanceId] = selectedInstanceSelector;
  store.createTransaction(
    [styleSourceSelectionsStore],
    (styleSourceSelections) => {
      const styleSourceSelection = getOrCreateStyleSourceSelectionMutable(
        styleSourceSelections,
        selectedInstanceId
      );
      if (styleSourceSelection.values.includes(newStyleSourceId) === false) {
        styleSourceSelection.values.push(newStyleSourceId);
      }
    }
  );
  selectedStyleSourceSelectorStore.set({ styleSourceId: newStyleSourceId });
};

const removeStyleSourceFromInstance = (styleSourceId: StyleSource["id"]) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const [selectedInstanceId] = selectedInstanceSelector;
  store.createTransaction(
    [styleSourceSelectionsStore],
    (styleSourceSelections) => {
      const styleSourceSelection =
        styleSourceSelections.get(selectedInstanceId);
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
  const selectedStyleSourceId =
    selectedStyleSourceSelectorStore.get()?.styleSourceId;
  if (selectedStyleSourceId === styleSourceId) {
    selectedStyleSourceSelectorStore.set(undefined);
  }
};

const deleteStyleSource = (styleSourceId: StyleSource["id"]) => {
  store.createTransaction(
    [styleSourcesStore, styleSourceSelectionsStore, stylesStore],
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
  const selectedStyleSourceId =
    selectedStyleSourceSelectorStore.get()?.styleSourceId;
  if (selectedStyleSourceId === styleSourceId) {
    selectedStyleSourceSelectorStore.set(undefined);
  }
};

const duplicateStyleSource = (styleSourceId: StyleSource["id"]) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const [selectedInstanceId] = selectedInstanceSelector;
  const styleSources = styleSourcesStore.get();
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
  const clonedStyles = cloneStyles(stylesStore.get(), clonedStyleSourceIds);

  store.createTransaction(
    [styleSourcesStore, stylesStore, styleSourceSelectionsStore],
    (styleSources, styles, styleSourceSelections) => {
      const styleSourceSelection =
        styleSourceSelections.get(selectedInstanceId);
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

  selectedStyleSourceSelectorStore.set({ styleSourceId: newStyleSource.id });

  return newStyleSource.id;
};

const convertLocalStyleSourceToToken = (styleSourceId: StyleSource["id"]) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const [selectedInstanceId] = selectedInstanceSelector;
  const newStyleSource: StyleSource = {
    type: "token",
    id: styleSourceId,
    name: "Local (Copy)",
  };
  store.createTransaction(
    [styleSourcesStore, styleSourceSelectionsStore],
    (styleSources, styleSourceSelections) => {
      const styleSourceSelection = getOrCreateStyleSourceSelectionMutable(
        styleSourceSelections,
        selectedInstanceId
      );
      // generated local style source was not applied so put first
      if (styleSourceSelection.values.includes(newStyleSource.id) === false) {
        styleSourceSelection.values.unshift(newStyleSource.id);
      }
      styleSources.set(newStyleSource.id, newStyleSource);
    }
  );
  selectedStyleSourceSelectorStore.set({ styleSourceId: newStyleSource.id });
};

const reorderStyleSources = (styleSourceIds: StyleSource["id"][]) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const [selectedInstanceId] = selectedInstanceSelector;
  store.createTransaction(
    [styleSourcesStore, styleSourceSelectionsStore],
    (styleSources, styleSourceSelections) => {
      const styleSourceSelection =
        styleSourceSelections.get(selectedInstanceId);
      if (styleSourceSelection === undefined) {
        return;
      }
      styleSourceSelection.values = styleSourceIds;
      // reoder may affect temporary generated and not yet applied
      // local style source so add one when not found in style sources
      for (const styleSourceId of styleSourceIds) {
        if (styleSources.has(styleSourceId) === false) {
          styleSources.set(styleSourceId, {
            type: "local",
            id: styleSourceId,
          });
        }
      }
    }
  );
};

const renameStyleSource = (id: StyleSource["id"], label: string) => {
  store.createTransaction([styleSourcesStore], (styleSources) => {
    const styleSource = styleSources.get(id);
    if (styleSource?.type === "token") {
      styleSource.name = label;
    }
  });
};

const componentStatesStore = computed(
  [selectedInstanceStore, registeredComponentMetasStore],
  (selectedInstance, registeredComponentMetas) => {
    if (selectedInstance === undefined) {
      return;
    }
    return registeredComponentMetas.get(selectedInstance.component)?.states;
  }
);

type StyleSourceInputItem = {
  id: string;
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

export const StyleSourcesSection = () => {
  const componentStates = useStore(componentStatesStore);
  const availableStyleSources = useStore(availableStyleSourcesStore);
  const selectedInstanceStyleSources = useStore(
    selectedInstanceStyleSourcesStore
  );
  const items = availableStyleSources.map((styleSource) =>
    convertToInputItem(styleSource, [])
  );
  const selectedInstanceStatesByStyleSourceId = useStore(
    selectedInstanceStatesByStyleSourceIdStore
  );
  const value = selectedInstanceStyleSources.map((styleSource) =>
    convertToInputItem(
      styleSource,
      selectedInstanceStatesByStyleSourceId.get(styleSource.id) ?? []
    )
  );
  const selectedOrLastStyleSourceSelector = useStore(
    selectedOrLastStyleSourceSelectorStore
  );

  const [editingItemId, setEditingItemId] = useState<
    undefined | StyleSource["id"]
  >(undefined);

  const [tokenToDelete, setTokenToDelete] = useState<StyleSourceToken>();

  return (
    <>
      <StyleSourceInput
        items={items}
        value={value}
        selectedItemSelector={selectedOrLastStyleSourceSelector}
        componentStates={componentStates}
        onCreateItem={createStyleSource}
        onSelectAutocompleteItem={({ id }) => {
          addStyleSourceToInstace(id);
        }}
        onDuplicateItem={(id) => {
          const newId = duplicateStyleSource(id);
          if (newId !== undefined) {
            setEditingItemId(newId);
          }
        }}
        onConvertToToken={(id) => {
          convertLocalStyleSourceToToken(id);
          setEditingItemId(id);
        }}
        onRemoveItem={(id) => {
          removeStyleSourceFromInstance(id);
        }}
        onDeleteItem={(id) => {
          const styleSources = styleSourcesStore.get();
          const token = styleSources.get(id);
          if (token?.type === "token") {
            setTokenToDelete(token);
          }
        }}
        onSort={(items) => {
          reorderStyleSources(items.map((item) => item.id));
        }}
        onSelectItem={(styleSourceSelector) => {
          createLocalStyleSourceIfNotExists(styleSourceSelector.styleSourceId);
          selectedStyleSourceSelectorStore.set(styleSourceSelector);
        }}
        // style source renaming
        editingItemId={editingItemId}
        onEditItem={(id) => {
          setEditingItemId(id);
          // prevent deselect after renaming
          if (id !== undefined) {
            selectedStyleSourceSelectorStore.set({
              styleSourceId: id,
            });
          }
        }}
        onChangeItem={(item) => {
          renameStyleSource(item.id, item.label);
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
        <Flex gap="3" direction="column" css={{ padding: theme.spacing[9] }}>
          <Text>{`Delete "${token}" token from the project including all of its styles?`}</Text>
          <Flex direction="rowReverse" gap="2">
            <DialogClose asChild>
              <Button
                color="destructive"
                onClick={() => {
                  onConfirm();
                }}
              >
                Delete
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
        <DialogTitle>Delete confirmation</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
