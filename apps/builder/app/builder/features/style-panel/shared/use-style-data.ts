import { useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
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
import { useStyleInfo } from "./style-info";
import { serverSyncStore } from "~/shared/sync";
import { $ephemeralStyles } from "~/canvas/stores";
import { $isEphemeralUpdateInProgress } from "~/builder/shared/nano-states";

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

export const useStyleData = (selectedInstanceId: Instance["id"]) => {
  const selectedBreakpoint = useStore($selectedBreakpoint);

  const currentStyle = useStyleInfo();

  const publishUpdates = useCallback(
    (
      type: "update" | "preview",
      updates: StyleUpdates["updates"],
      options: StyleUpdateOptions
    ) => {
      const selectedStyleSource = $selectedStyleSource.get();
      const styleSourceSelector = $selectedOrLastStyleSourceSelector.get();

      if (
        updates.length === 0 ||
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
          const instanceId = selectedInstanceId;
          const breakpointId = selectedBreakpoint.id;
          // set only selected style source and update selection with it
          // generated local style source will not be written if not selected
          styleSources.set(selectedStyleSource.id, selectedStyleSource);
          const selectionValues =
            styleSourceSelections.get(instanceId)?.values ?? [];
          if (
            selectionValues.includes(styleSourceSelector.styleSourceId) ===
            false
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
    },
    [selectedBreakpoint, selectedInstanceId]
  );

  const setProperty = useCallback<SetProperty>(
    (property) => {
      return (value, options: StyleUpdateOptions = { isEphemeral: false }) => {
        if (value.type !== "invalid") {
          const isEphemeral = options.isEphemeral ?? false;
          const updates = [{ operation: "set" as const, property, value }];
          const type = isEphemeral ? "preview" : "update";
          publishUpdates(type, updates, options);
          $isEphemeralUpdateInProgress.set(isEphemeral);
        }
      };
    },
    [publishUpdates]
  );

  const deleteProperty = useCallback(
    (
      property: StyleProperty,
      options: StyleUpdateOptions = { isEphemeral: false }
    ) => {
      const updates = [{ operation: "delete" as const, property }];
      const isEphemeral = options.isEphemeral ?? false;
      const type = isEphemeral ? "preview" : "update";
      publishUpdates(type, updates, options);
      $isEphemeralUpdateInProgress.set(isEphemeral);
    },
    [publishUpdates]
  );

  const createBatchUpdate = useCallback(() => {
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
      if (updates.length === 0) {
        return;
      }
      const isEphemeral = options.isEphemeral ?? false;
      const type = isEphemeral ? "preview" : "update";
      publishUpdates(type, updates, options);
      // Border color control, when blurred, will have a batch delete operation with isEphemeral true.
      // in this case we want to show outlines.
      const hasDelete = updates.some((update) => update.operation === "delete");
      $isEphemeralUpdateInProgress.set(isEphemeral && hasDelete === false);
      updates = [];
    };

    return {
      setProperty,
      deleteProperty,
      publish,
    };
  }, [publishUpdates]);

  return {
    currentStyle,
    setProperty,
    deleteProperty,
    createBatchUpdate,
  };
};
