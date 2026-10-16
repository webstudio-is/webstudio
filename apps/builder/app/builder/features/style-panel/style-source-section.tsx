import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import { type StyleSource, type StyleSourceToken } from "@webstudio-is/sdk";
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
  $selectedInstanceStatesByStyleSourceId,
  $selectedInstanceStyleSources,
  $selectedOrLastStyleSourceSelector,
  $selectedStyleSources,
} from "~/shared/nano-states";
import {
  $styleSourceSelections,
  $styleSources,
} from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { subscribe } from "~/shared/pubsub";
import { $selectedInstance } from "~/shared/nano-states";
import { StyleConditionSelect } from "./style-condition-select";

// Declare command for this module
declare module "~/shared/pubsub" {
  interface CommandRegistry {
    focusStyleSourceInput: undefined;
  }
}

// picks where declarations are saved; the selected condition stays as is
const selectStyleSource = (styleSourceId: StyleSource["id"]) => {
  const instanceId = $selectedInstance.get()?.id;
  if (instanceId === undefined) {
    return;
  }
  const selectedStyleSources = new Map($selectedStyleSources.get());
  selectedStyleSources.set(instanceId, styleSourceId);
  $selectedStyleSources.set(selectedStyleSources);
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
  const attachedStyleSourceIds = new Set(
    $styleSourceSelections.get().get(instanceId)?.values
  );
  executeRuntimeMutation({
    id: "styleSources.reorder",
    input: {
      instanceId,
      // The style panel adds a temporary local source until local styles are
      // persisted. Exclude it because the runtime only accepts attached IDs.
      styleSourceIds: styleSourceIds.filter((id) =>
        attachedStyleSourceIds.has(id)
      ),
    },
  });
};

const clearStyles = (styleSourceId: StyleSource["id"]) => {
  executeRuntimeMutation({
    id: "styleSources.clearStyles",
    input: { styleSourceId },
  });
};

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
          selectStyleSource(styleSourceSelector.styleSourceId);
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
      <StyleConditionSelect />
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
  reorderStyleSources,
};
