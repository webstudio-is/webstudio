import { useState } from "react";
import store from "immerhin";
import { nanoid } from "nanoid";
import { theme, DeprecatedText2 } from "@webstudio-is/design-system";
import type {
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/project-build";
import {
  type ItemSource,
  type ItemState,
  StyleSourceInput,
} from "./style-source";
import { useStore } from "@nanostores/react";
import {
  availableStyleSourcesStore,
  selectedInstanceIdStore,
  selectedInstanceStyleSourcesStore,
  selectedStyleSourceIdStore,
  selectedStyleSourceStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
} from "~/shared/nano-states";
import { removeByMutable } from "~/shared/array-utils";

const createStyleSource = (name: string) => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  const selectedInstanceStyleSources = selectedInstanceStyleSourcesStore.get();
  if (selectedInstanceId === undefined) {
    return;
  }
  const newStyleSource: StyleSource = {
    type: "token",
    id: nanoid(),
    name,
  };
  // set style sources and selection along with generated local style source
  const newStyleSources = [...selectedInstanceStyleSources, newStyleSource];
  const newStyleSourceSelection: StyleSourceSelection = {
    instanceId: selectedInstanceId,
    values: [
      ...selectedInstanceStyleSources.map((styleSource) => styleSource.id),
      newStyleSource.id,
    ],
  };
  store.createTransaction(
    [styleSourcesStore, styleSourceSelectionsStore],
    (styleSources, styleSourceSelections) => {
      // set new style source and local if not set before
      for (const newStyleSource of newStyleSources) {
        styleSources.set(newStyleSource.id, newStyleSource);
      }
      styleSourceSelections.set(selectedInstanceId, newStyleSourceSelection);
    }
  );
};

const addStyleSourceToInstace = (styleSourceId: StyleSource["id"]) => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  const selectedInstanceStyleSources = selectedInstanceStyleSourcesStore.get();
  if (selectedInstanceId === undefined) {
    return;
  }
  // set style sources and selection along with generated local style source
  const newStyleSourceSelection: StyleSourceSelection = {
    instanceId: selectedInstanceId,
    values: [
      ...selectedInstanceStyleSources.map((styleSource) => styleSource.id),
      styleSourceId,
    ],
  };
  store.createTransaction(
    [styleSourcesStore, styleSourceSelectionsStore],
    (styleSources, styleSourceSelections) => {
      // set local style source if not set before
      for (const newStyleSource of selectedInstanceStyleSources) {
        styleSources.set(newStyleSource.id, newStyleSource);
      }
      styleSourceSelections.set(selectedInstanceId, newStyleSourceSelection);
    }
  );
};

const removeStyleSourceFromInstance = (styleSourceId: StyleSource["id"]) => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  if (selectedInstanceId === undefined) {
    return;
  }
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

const reorderStyleSources = (styleSourceIds: StyleSource["id"][]) => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  store.createTransaction(
    [styleSourceSelectionsStore],
    (styleSourceSelections) => {
      if (selectedInstanceId === undefined) {
        return;
      }
      const styleSourceSelection =
        styleSourceSelections.get(selectedInstanceId);
      if (styleSourceSelection === undefined) {
        return;
      }
      styleSourceSelection.values = styleSourceIds;
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
        onRemoveItem={({ id }) => {
          removeStyleSourceFromInstance(id);
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
          selectedStyleSourceIdStore.set(id);
        }}
        onChangeItem={(item) => {
          renameStyleSource(item.id, item.label);
        }}
      />
    </>
  );
};
