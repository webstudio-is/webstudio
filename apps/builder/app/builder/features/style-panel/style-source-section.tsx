import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import { computed } from "nanostores";
import { pseudoClassesByTag } from "@webstudio-is/html-data";
import { isPseudoElement } from "@webstudio-is/css-data";
import {
  type Instance,
  type StyleSource,
  type StyleSourceToken,
  type StyleSourceSelections,
  type StyleDecl,
  type StyleSources,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
import { type ItemSource, StyleSourceInput } from "./style-source";
import {
  renameStyleSource,
  type RenameStyleSourceError,
  deleteStyleSource,
  DeleteStyleSourceDialog,
} from "~/builder/shared/style-source-actions";
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
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { subscribe } from "~/shared/pubsub";
import { $selectedInstance } from "~/shared/awareness";
import { $instanceTags } from "./shared/model";

// Declare command for this module
declare module "~/shared/pubsub" {
  interface CommandRegistry {
    focusStyleSourceInput: undefined;
  }
}

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

const addStyleSourceToInstanceMutable = (
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
      addStyleSourceToInstanceMutable(
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
      addStyleSourceToInstanceMutable(
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

const clearStyles = (styleSourceId: StyleSource["id"]) => {
  serverSyncStore.createTransaction([$styles], (styles) => {
    for (const [styleDeclKey, styleDecl] of styles) {
      if (styleDecl.styleSourceId === styleSourceId) {
        styles.delete(styleDeclKey);
      }
    }
  });
};

type SelectorConfig = {
  type: "state" | "pseudoElement";
  selector: string;
  label: string;
  source: "native" | "component" | "custom";
};

const getComponentStates = ({
  predefinedStates,
  componentStates,
  instanceStyleSourceIds,
  styles,
  selectedStyleState,
}: {
  predefinedStates: string[];
  componentStates: Array<{ label: string; selector: string }>;
  instanceStyleSourceIds: Set<StyleSource["id"]>;
  styles: Iterable<Pick<StyleDecl, "state" | "styleSourceId">>;
  selectedStyleState: string | undefined;
}): SelectorConfig[] => {
  const allStates = [...pseudoClassesByTag["*"], ...predefinedStates];

  const usedSelectors = new Set<string>();
  for (const styleDecl of styles) {
    if (
      styleDecl.state &&
      styleDecl.state.trim() &&
      instanceStyleSourceIds.has(styleDecl.styleSourceId)
    ) {
      usedSelectors.add(styleDecl.state);
    }
  }

  // Show selected state in menu immediately, before any styles are added
  if (selectedStyleState && selectedStyleState.trim()) {
    usedSelectors.add(selectedStyleState);
  }

  const allStateSelectors = new Set([...allStates, ...usedSelectors]);

  const toConfig = (selector: string): SelectorConfig => ({
    type: isPseudoElement(selector) ? "pseudoElement" : "state",
    label: selector,
    selector,
    source: allStates.includes(selector) ? "native" : "custom",
  });

  const states = Array.from(allStateSelectors)
    .filter((state) => !isPseudoElement(state))
    .map(toConfig);

  const pseudoElements = Array.from(allStateSelectors)
    .filter(isPseudoElement)
    .map(toConfig);

  const componentStatesConfig = componentStates.map((item) => ({
    type: "state" as const,
    ...item,
    source: "component" as const,
  }));

  return [...states, ...componentStatesConfig, ...pseudoElements];
};

const $componentStates = computed(
  [
    $selectedInstance,
    $registeredComponentMetas,
    $instanceTags,
    $styles,
    $selectedStyleState,
    $styleSourceSelections,
  ],
  (
    selectedInstance,
    registeredComponentMetas,
    instanceTags,
    styles,
    selectedStyleState,
    styleSourceSelections
  ) => {
    if (selectedInstance === undefined) {
      return;
    }
    const tag = instanceTags.get(selectedInstance.id);
    const meta = registeredComponentMetas.get(selectedInstance.component);

    return getComponentStates({
      predefinedStates: pseudoClassesByTag[tag ?? ""] ?? [],
      componentStates: meta?.states ?? [],
      instanceStyleSourceIds: new Set(
        styleSourceSelections.get(selectedInstance.id)?.values
      ),
      styles: styles.values(),
      selectedStyleState,
    });
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
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const componentStates = useStore($componentStates);
  const availableStyleSources = useStore($availableStyleSources);
  const selectedInstanceStyleSources = useStore($selectedInstanceStyleSources);
  const selectedInstanceStatesByStyleSourceId = useStore(
    $selectedInstanceStatesByStyleSourceId
  );
  const selectedOrLastStyleSourceSelector = useStore(
    $selectedOrLastStyleSourceSelector
  );

  // Subscribe to focusStyleSourceInput command
  useEffect(() => {
    const unsubscribe = subscribe("command:focusStyleSourceInput", () => {
      if (inputRef) {
        inputRef.focus();
      }
    });
    return unsubscribe;
  }, [inputRef]);

  const value = selectedInstanceStyleSources.map((styleSource) =>
    convertToInputItem(
      styleSource,
      selectedInstanceStatesByStyleSourceId.get(styleSource.id) ?? []
    )
  );

  const [editingItemId, setEditingItemId] = useState<StyleSource["id"]>();

  const [tokenToDelete, setTokenToDelete] = useState<StyleSourceToken>();
  const [error, setError] = useState<RenameStyleSourceError>();

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
        inputRef={setInputRef}
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
      <DeleteStyleSourceDialog
        styleSource={tokenToDelete}
        onClose={() => {
          setTokenToDelete(undefined);
        }}
        onConfirm={(styleSourceId) => {
          deleteStyleSource(styleSourceId);
          setTokenToDelete(undefined);
        }}
      />
    </>
  );
};

export const __testing__ = { getComponentStates };
