import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import { pseudoClassesByTag } from "@webstudio-is/html-data";
import { isPseudoElement } from "@webstudio-is/css-data";
import {
  type StyleSource,
  type StyleSourceToken,
  type StyleDecl,
} from "@webstudio-is/sdk";
import { type RenameStyleSourceError } from "@webstudio-is/project-build/runtime";
import { type ItemSource, StyleSourceInput } from "./style-source";
import {
  renameStyleSource,
  deleteStyleSource,
  DeleteStyleSourceDialog,
  setStyleSourceLocked,
  deselectMatchingStyleSource,
} from "~/builder/shared/style-source-actions";
import {
  $registeredComponentMetas,
  $selectedInstanceStatesByStyleSourceId,
  $selectedInstanceStyleSources,
  $selectedOrLastStyleSourceSelector,
  $selectedStyleSources,
  $selectedStyleState,
} from "~/shared/nano-states";
import {
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { subscribe } from "~/shared/pubsub";
import { $selectedInstance } from "~/shared/nano-states";
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

const createStyleSource = (name: string) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  const result = executeRuntimeMutation({
    id: "designTokens.createAttached",
    input: {
      tokens: [{ name }],
      instanceIds: [instanceId],
    },
  });
  const tokenId = result?.result.tokenIds?.[0];
  if (typeof tokenId !== "string") {
    return;
  }
  selectStyleSource(tokenId);
};

export const addStyleSourceToInstance = (
  newStyleSourceId: StyleSource["id"]
) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  executeRuntimeMutation({
    id: "designTokens.attach",
    input: {
      designTokenId: newStyleSourceId,
      instanceIds: [instanceId],
    },
  });
  selectStyleSource(newStyleSourceId);
};

const removeStyleSourceFromInstance = (styleSourceId: StyleSource["id"]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  executeRuntimeMutation({
    id: "designTokens.detach",
    input: {
      designTokenId: styleSourceId,
      instanceIds: [instanceId],
    },
  });
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
  const result = executeRuntimeMutation({
    id: "styleSources.duplicate",
    input: {
      instanceId,
      styleSourceId,
    },
  });
  const newStyleSourceId = result?.result.styleSourceId;
  if (typeof newStyleSourceId !== "string") {
    return;
  }
  selectStyleSource(newStyleSourceId);
  return newStyleSourceId;
};

const convertLocalStyleSourceToToken = (styleSourceId: StyleSource["id"]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  const result = executeRuntimeMutation({
    id: "styleSources.convertLocalToToken",
    input: {
      instanceId,
      styleSourceId,
      name: "Local (Copy)",
    },
  });
  const tokenId = result?.result.styleSourceId;
  if (typeof tokenId === "string") {
    selectStyleSource(tokenId);
  }
};

const reorderStyleSources = (styleSourceIds: StyleSource["id"][]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  executeRuntimeMutation({
    id: "styleSources.reorder",
    input: {
      instanceId,
      styleSourceIds,
    },
  });
};

const clearStyles = (styleSourceId: StyleSource["id"]) => {
  executeRuntimeMutation({
    id: "styleSources.clearStyles",
    input: { styleSourceId },
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

  const componentStateSelectors = new Set(
    componentStates.map((s) => s.selector)
  );
  const allStateSelectors = new Set([...allStates, ...usedSelectors]);

  const toConfig = (selector: string): SelectorConfig => ({
    type: isPseudoElement(selector) ? "pseudoElement" : "state",
    label: selector,
    selector,
    source: allStates.includes(selector) ? "native" : "custom",
  });

  const states = Array.from(allStateSelectors)
    .filter(
      (state) => !isPseudoElement(state) && !componentStateSelectors.has(state)
    )
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
  locked: boolean;
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
    locked: styleSource.type === "token" && styleSource.locked === true,
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
        onToggleLockItem={(id, locked) => {
          setStyleSourceLocked(id, locked);
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

export const __testing__ = {
  clearStyles,
  convertLocalStyleSourceToToken,
  duplicateStyleSource,
  getComponentStates,
  reorderStyleSources,
};
