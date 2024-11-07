import {
  type Breakpoint,
  type Instance,
  getStyleDeclKey,
  StyleDecl,
} from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  $selectedBreakpoint,
  $selectedOrLastStyleSourceSelector,
  $selectedStyleSource,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { $ephemeralStyles } from "~/canvas/stores";
import { $selectedInstance } from "~/shared/awareness";

export type StyleUpdate =
  | {
      operation: "delete";
      property: StyleProperty;
    }
  | {
      operation: "set";
      property: StyleProperty;
      value: StyleValue;
    };

type StyleUpdates = {
  id: Instance["id"];
  updates: Array<StyleUpdate>;
  breakpoint: Breakpoint;
  state: undefined | string;
};

export type StyleUpdateOptions = { isEphemeral?: boolean; listed?: boolean };

export type SetValue = (
  style: StyleValue,
  options?: StyleUpdateOptions
) => void;

export type SetProperty = (property: StyleProperty) => SetValue;

export type DeleteProperty = (
  property: StyleProperty,
  options?: StyleUpdateOptions
) => void;

export type CreateBatchUpdate = () => {
  setProperty: (property: StyleProperty) => (style: StyleValue) => void;
  deleteProperty: (property: StyleProperty) => void;
  publish: (options?: StyleUpdateOptions) => void;
};

const publishUpdates = (
  type: "update" | "preview",
  updates: StyleUpdates["updates"],
  options: StyleUpdateOptions
) => {
  if (updates.length === 0) {
    return;
  }

  const selectedInstance = $selectedInstance.get();
  const selectedBreakpoint = $selectedBreakpoint.get();
  const selectedStyleSource = $selectedStyleSource.get();
  const styleSourceSelector = $selectedOrLastStyleSourceSelector.get();

  if (
    selectedInstance === undefined ||
    selectedBreakpoint === undefined ||
    selectedStyleSource === undefined ||
    styleSourceSelector === undefined
  ) {
    return;
  }

  if (type === "preview") {
    const ephemeralStyles: ReturnType<typeof $ephemeralStyles.get> = [];
    for (const update of updates) {
      if (update.operation === "set") {
        ephemeralStyles.push({
          breakpointId: selectedBreakpoint.id,
          styleSourceId: styleSourceSelector.styleSourceId,
          state: styleSourceSelector.state,
          property: update.property,
          value: update.value,
          listed: options.listed,
        });
      }
    }
    $ephemeralStyles.set(ephemeralStyles);
    return;
  }

  $ephemeralStyles.set([]);
  serverSyncStore.createTransaction(
    [$styleSourceSelections, $styleSources, $styles],
    (styleSourceSelections, styleSources, styles) => {
      const instanceId = selectedInstance.id;
      const breakpointId = selectedBreakpoint.id;
      // set only selected style source and update selection with it
      // generated local style source will not be written if not selected
      styleSources.set(selectedStyleSource.id, selectedStyleSource);
      const selectionValues =
        styleSourceSelections.get(instanceId)?.values ?? [];
      if (
        selectionValues.includes(styleSourceSelector.styleSourceId) === false
      ) {
        styleSourceSelections.set(instanceId, {
          instanceId,
          values: [...selectionValues, styleSourceSelector.styleSourceId],
        });
      }

      for (const update of updates) {
        if (update.operation === "set") {
          const styleDecl: StyleDecl = {
            breakpointId,
            styleSourceId: styleSourceSelector.styleSourceId,
            state: styleSourceSelector.state,
            property: update.property,
            value: update.value,
            listed: options.listed,
          };
          styles.set(getStyleDeclKey(styleDecl), styleDecl);
        }

        if (update.operation === "delete") {
          const styleDeclKey = getStyleDeclKey({
            breakpointId,
            styleSourceId: styleSourceSelector.styleSourceId,
            state: styleSourceSelector.state,
            property: update.property,
          });
          styles.delete(styleDeclKey);
        }
      }
    }
  );
};

export const setProperty: SetProperty = (property) => {
  return (value, options: StyleUpdateOptions = { isEphemeral: false }) => {
    if (value.type !== "invalid") {
      const updates = [{ operation: "set" as const, property, value }];
      const type = options.isEphemeral ? "preview" : "update";

      publishUpdates(type, updates, options);
    }
  };
};

export const deleteProperty = (
  property: StyleProperty,
  options: StyleUpdateOptions = { isEphemeral: false }
) => {
  const updates = [{ operation: "delete" as const, property }];
  const type = options.isEphemeral ? "preview" : "update";
  publishUpdates(type, updates, options);
};

export const createBatchUpdate = () => {
  let updates: StyleUpdates["updates"] = [];

  const setProperty = (property: StyleProperty) => {
    const setValue = (value: StyleValue) => {
      if (value.type === "invalid") {
        return;
      }

      updates.push({ operation: "set", property, value });
    };
    return setValue;
  };

  const deleteProperty = (property: StyleProperty) => {
    updates.push({ operation: "delete", property });
  };

  const publish = (options: StyleUpdateOptions = { isEphemeral: false }) => {
    if (!updates.length) {
      return;
    }
    const type = options.isEphemeral ? "preview" : "update";
    publishUpdates(type, updates, options);
    updates = [];
  };

  return {
    setProperty,
    deleteProperty,
    publish,
  };
};

export const resetEphemeralStyles = () => {
  $ephemeralStyles.set([]);
};
