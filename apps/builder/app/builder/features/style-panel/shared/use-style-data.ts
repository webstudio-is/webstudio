import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import { camelCaseProperty } from "@webstudio-is/css-data";
import {
  $selectedBreakpoint,
  $selectedOrLastStyleSourceSelector,
  $selectedStyleSource,
} from "~/shared/nano-states";
import {
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { $ephemeralStyles } from "~/canvas/stores";
import { $selectedInstance } from "~/shared/nano-states";
import {
  createSelectedStyleDeclarationDeletePayload,
  createSelectedStyleDeclarationUpdatePayload,
  isStyleSourceLocked,
} from "@webstudio-is/project-build/runtime/styles";
import { applyBuilderPatchPayloadMutable } from "~/shared/instance-utils/data";

type StyleUpdate =
  | {
      operation: "delete";
      property: CssProperty;
    }
  | {
      operation: "set";
      property: CssProperty;
      value: StyleValue;
    };

export type StyleUpdateOptions = { isEphemeral?: boolean; listed?: boolean };

export type SetValue = (
  style: StyleValue,
  options?: StyleUpdateOptions
) => void;

export type SetProperty = (property: CssProperty) => SetValue;

export type DeleteProperty = (
  property: CssProperty,
  options?: StyleUpdateOptions
) => void;

export type CreateBatchUpdate = () => {
  setProperty: (property: CssProperty) => (style: StyleValue) => void;
  deleteProperty: (property: CssProperty) => void;
  publish: (options?: StyleUpdateOptions) => void;
};

const publishUpdates = (
  type: "update" | "preview",
  updates: StyleUpdate[],
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

  if (isStyleSourceLocked(selectedStyleSource)) {
    if (type === "preview") {
      $ephemeralStyles.set([]);
    }
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
          property: camelCaseProperty(update.property),
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
      for (const update of updates) {
        if (update.operation === "set") {
          applyBuilderPatchPayloadMutable(
            { styleSourceSelections, styleSources, styles },
            createSelectedStyleDeclarationUpdatePayload({
              updates: [
                {
                  instanceId,
                  styleSource: selectedStyleSource,
                  styleSourceId: styleSourceSelector.styleSourceId,
                  breakpoint: breakpointId,
                  state: styleSourceSelector.state,
                  property: camelCaseProperty(update.property),
                  value: update.value,
                  listed: options.listed,
                },
              ],
              styleSources,
              styleSourceSelections: styleSourceSelections.values(),
              styles: styles.values(),
            }).payload
          );
        }

        if (update.operation === "delete") {
          applyBuilderPatchPayloadMutable(
            { styles },
            createSelectedStyleDeclarationDeletePayload({
              deletions: [
                {
                  styleSourceId: styleSourceSelector.styleSourceId,
                  breakpoint: breakpointId,
                  state: styleSourceSelector.state,
                  property: camelCaseProperty(update.property),
                },
              ],
              styles: styles.values(),
            }).payload
          );
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
  property: CssProperty,
  options: StyleUpdateOptions = { isEphemeral: false }
) => {
  const updates = [{ operation: "delete" as const, property }];
  const type = options.isEphemeral ? "preview" : "update";
  publishUpdates(type, updates, options);
};

export const createBatchUpdate = () => {
  let updates: StyleUpdate[] = [];

  const setProperty = (property: CssProperty) => {
    const setValue = (value: StyleValue) => {
      if (value.type === "invalid") {
        return;
      }
      updates.push({ operation: "set", property, value });
    };
    return setValue;
  };

  const deleteProperty = (property: CssProperty) => {
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
