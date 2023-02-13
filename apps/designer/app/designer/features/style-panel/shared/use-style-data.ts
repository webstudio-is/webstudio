import { useCallback } from "react";
import store from "immerhin";
import warnOnce from "warn-once";
import { getStyleDeclKey, type Instance } from "@webstudio-is/project-build";
import type { StyleUpdates } from "@webstudio-is/project";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import type { Publish } from "~/shared/pubsub";
import {
  selectedStyleSourceStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
} from "~/shared/nano-states";
import { useSelectedBreakpoint } from "~/designer/shared/nano-states";
// @todo: must be removed, now it's only for compatibility with existing code
import { parseCssValue } from "./parse-css-value";
import { useStyleInfo } from "./style-info";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateStyle: StyleUpdates;
    previewStyle: StyleUpdates;
  }
}

type UseStyleData = {
  publish: Publish;
  selectedInstance: Instance;
};

export type StyleUpdateOptions = { isEphemeral: boolean };

// @todo: style must have StyleValue type always
export type SetProperty = (
  property: StyleProperty
) => (style: string | StyleValue, options?: StyleUpdateOptions) => void;

export type DeleteProperty = (
  property: StyleProperty,
  options?: StyleUpdateOptions
) => void;

export type CreateBatchUpdate = () => {
  setProperty: (
    property: StyleProperty
  ) => (style: string | StyleValue) => void;
  deleteProperty: (property: StyleProperty) => void;
  publish: (options?: StyleUpdateOptions) => void;
};

export const useStyleData = ({ selectedInstance, publish }: UseStyleData) => {
  const [selectedBreakpoint] = useSelectedBreakpoint();

  const currentStyle = useStyleInfo();

  const publishUpdates = useCallback(
    (type: "update" | "preview", updates: StyleUpdates["updates"]) => {
      const selectedStyleSource = selectedStyleSourceStore.get();

      if (
        updates.length === 0 ||
        selectedBreakpoint === undefined ||
        selectedStyleSource === undefined
      ) {
        return;
      }
      publish({
        type: type === "update" ? "updateStyle" : "previewStyle",
        payload: {
          id: selectedInstance.id,
          updates,
          breakpoint: selectedBreakpoint,
        },
      });

      if (type !== "update") {
        return;
      }

      store.createTransaction(
        [styleSourceSelectionsStore, styleSourcesStore, stylesStore],
        (styleSourceSelections, styleSources, styles) => {
          const instanceId = selectedInstance.id;
          const breakpointId = selectedBreakpoint.id;
          const styleSourceId = selectedStyleSource.id;
          // set only selected style source and update selection with it
          // generated local style source will not be written if not selected
          styleSources.set(selectedStyleSource.id, selectedStyleSource);
          const selectionValues =
            styleSourceSelections.get(instanceId)?.values ?? [];
          styleSourceSelections.set(instanceId, {
            instanceId,
            values: selectionValues.includes(styleSourceId)
              ? selectionValues
              : [...selectionValues, styleSourceId],
          });

          for (const update of updates) {
            if (update.operation === "set") {
              const styleDecl = {
                breakpointId,
                styleSourceId,
                property: update.property,
                value: update.value,
              };
              styles.set(getStyleDeclKey(styleDecl), styleDecl);
            }

            if (update.operation === "delete") {
              const styleDeclKey = getStyleDeclKey({
                breakpointId,
                styleSourceId,
                property: update.property,
              });
              styles.delete(styleDeclKey);
            }
          }
        }
      );
    },
    [publish, selectedBreakpoint, selectedInstance]
  );

  // @deprecated should not be called
  const toStyleValue = (property: StyleProperty, value: string) => {
    if (property === "fontFamily") {
      return { type: "fontFamily" as const, value: [value] };
    }

    return parseCssValue(property, value);
  };

  const setProperty = useCallback<SetProperty>(
    (property) => {
      return (inputOrStyle, options = { isEphemeral: false }) => {
        warnOnce(
          typeof inputOrStyle === "string",
          "setProperty should be called with a style object, string is deprecated"
        );

        const nextValue =
          typeof inputOrStyle === "string"
            ? toStyleValue(property, inputOrStyle)
            : inputOrStyle;

        if (nextValue.type !== "invalid") {
          const updates = [
            { operation: "set" as const, property, value: nextValue },
          ];
          const type = options.isEphemeral ? "preview" : "update";

          publishUpdates(type, updates);
        }
      };
    },
    [publishUpdates]
  );

  const deleteProperty = useCallback(
    (property: StyleProperty, options = { isEphemeral: false }) => {
      const updates = [{ operation: "delete" as const, property }];
      const type = options.isEphemeral ? "preview" : "update";
      publishUpdates(type, updates);
    },
    [publishUpdates]
  );

  const createBatchUpdate = useCallback(() => {
    let updates: StyleUpdates["updates"] = [];

    const setProperty = (property: StyleProperty) => {
      const setValue = (inputOrStyle: string | StyleValue) => {
        warnOnce(
          typeof inputOrStyle === "string",
          "setProperty should be called with a style object, string is deprecated"
        );

        const value =
          typeof inputOrStyle === "string"
            ? toStyleValue(property, inputOrStyle)
            : inputOrStyle;

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

    const publish = (options = { isEphemeral: false }) => {
      if (!updates.length) {
        return;
      }
      const type = options.isEphemeral ? "preview" : "update";
      publishUpdates(type, updates);
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
