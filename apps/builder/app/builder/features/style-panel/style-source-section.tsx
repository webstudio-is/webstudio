import { useState } from "react";
import store from "immerhin";
import { nanoid } from "nanoid";
import { theme, DeprecatedText2 } from "@webstudio-is/design-system";
import {
  type Instance,
  type StyleSource,
  type StyleSourceSelections,
  getStyleDeclKey,
} from "@webstudio-is/project-build";
import {
  type ItemSource,
  type ItemState,
  StyleSourceInput,
} from "./style-source";
import { useStore } from "@nanostores/react";
import {
  availableStyleSourcesStore,
  selectedInstanceSelectorStore,
  selectedInstanceStyleSourcesStore,
  selectedStyleSourceIdStore,
  selectedStyleSourceStore,
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
  selectedStyleSourceIdStore.set(newStyleSource.id);
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
  selectedStyleSourceIdStore.set(newStyleSourceId);
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

  selectedStyleSourceIdStore.set(newStyleSource.id);

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
  selectedStyleSourceIdStore.set(newStyleSource.id);
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

type StyleSourceInputItem = {
  id: string;
  label: string;
  isEditable: boolean;
  state: ItemState;
  source: ItemSource;
};

const convertToInputItem = (
  styleSource: StyleSource,
  selectedStyleSource?: StyleSource["id"]
): StyleSourceInputItem => {
  const state: ItemState =
    selectedStyleSource === styleSource.id ? "selected" : "unselected";
  if (styleSource.type === "local") {
    return {
      id: styleSource.id,
      label: "Local",
      isEditable: false,
      state,
      source: styleSource.type,
    };
  }
  return {
    id: styleSource.id,
    label: styleSource.name,
    isEditable: true,
    state,
    source: styleSource.type,
  };
};

export const StyleSourcesSection = () => {
  const availableStyleSources = useStore(availableStyleSourcesStore);
  const selectedInstanceStyleSources = useStore(
    selectedInstanceStyleSourcesStore
  );
  const selectedStyleSource = useStore(selectedStyleSourceStore);
  const items = availableStyleSources.map((styleSource) =>
    convertToInputItem(styleSource)
  );
  const value = selectedInstanceStyleSources.map((styleSource) =>
    convertToInputItem(styleSource, selectedStyleSource?.id)
  );

  const [editingItemId, setEditingItemId] = useState<
    undefined | StyleSource["id"]
  >(undefined);

  return (
    <>
      <DeprecatedText2 css={{ py: theme.spacing[9] }} variant="label">
        Style Sources
      </DeprecatedText2>

      <StyleSourceInput
        items={items}
        value={value}
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
          deleteStyleSource(id);
        }}
        onSort={(items) => {
          reorderStyleSources(items.map((item) => item.id));
        }}
        onSelectItem={(selectedItem) => {
          selectedStyleSourceIdStore.set(selectedItem?.id);
        }}
        // style source renaming
        editingItemId={editingItemId}
        onEditItem={(id) => {
          setEditingItemId(id);
          // prevent deselect after renaming
          if (id !== undefined) {
            selectedStyleSourceIdStore.set(id);
          }
        }}
        onChangeItem={(item) => {
          renameStyleSource(item.id, item.label);
        }}
      />
    </>
  );
};
