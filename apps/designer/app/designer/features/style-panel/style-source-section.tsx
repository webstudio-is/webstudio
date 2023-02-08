import store from "immerhin";
import { nanoid } from "nanoid";
import { theme, DeprecatedText2 } from "@webstudio-is/design-system";
import type {
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/project-build";
import { ItemState, StyleSourceInput } from "./style-source";
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
import {
  removeByMutable,
  replaceByOrAppendMutable,
} from "~/shared/array-utils";

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
      replaceByOrAppendMutable(
        styleSourceSelections,
        newStyleSourceSelection,
        (styleSourceSelection) =>
          styleSourceSelection.instanceId === selectedInstanceId
      );
    }
  );
};

const addStyleSourceToInstace = (styleSourceId: StyleSource["id"]) => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  const selectedInstanceStyleSources = selectedInstanceStyleSourcesStore.get();
  if (selectedInstanceId === undefined) {
    return;
  }
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
      replaceByOrAppendMutable(
        styleSourceSelections,
        newStyleSourceSelection,
        (styleSourceSelection) =>
          styleSourceSelection.instanceId === selectedInstanceId
      );
    }
  );
};

const removeStyleSourceFromInstance = (styleSourceId: StyleSource["id"]) => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  store.createTransaction(
    [styleSourceSelectionsStore],
    (styleSourceSelections) => {
      const styleSourceSelection = styleSourceSelections.find(
        (styleSourceSelection) =>
          styleSourceSelection.instanceId === selectedInstanceId
      );
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
      const styleSourceSelection = styleSourceSelections.find(
        (styleSourceSelection) =>
          styleSourceSelection.instanceId === selectedInstanceId
      );
      if (styleSourceSelection === undefined) {
        return;
      }
      styleSourceSelection.values = styleSourceIds;
    }
  );
};

const convertToInputItem = (
  styleSource: StyleSource,
  selectedStyleSource?: StyleSource["id"]
) => {
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

  return (
    <>
      <DeprecatedText2 css={{ py: theme.spacing[9] }} variant="label">
        Style Sources
      </DeprecatedText2>

      <StyleSourceInput
        items={items}
        value={value}
        onCreateItem={({ label }) => {
          createStyleSource(label);
        }}
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
      />
    </>
  );
};
