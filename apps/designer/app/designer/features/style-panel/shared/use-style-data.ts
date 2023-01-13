import { useCallback } from "react";
import store from "immerhin";
import warnOnce from "warn-once";
import type { SelectedInstanceData, StyleUpdates } from "@webstudio-is/project";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { type Publish } from "~/shared/pubsub";
import { stylesContainer } from "~/shared/nano-states";
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
  selectedInstanceData?: SelectedInstanceData;
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

export const useStyleData = ({
  selectedInstanceData,
  publish,
}: UseStyleData) => {
  const [selectedBreakpoint] = useSelectedBreakpoint();

  const currentStyle = useStyleInfo();

  const publishUpdates = useCallback(
    (type: "update" | "preview", updates: StyleUpdates["updates"]) => {
      if (
        updates.length === 0 ||
        selectedInstanceData === undefined ||
        selectedBreakpoint === undefined
      ) {
        return;
      }
      publish({
        type: type === "update" ? "updateStyle" : "previewStyle",
        payload: {
          id: selectedInstanceData.id,
          updates,
          breakpoint: selectedBreakpoint,
        },
      });

      if (type !== "update") {
        return;
      }

      store.createTransaction([stylesContainer], (styles) => {
        const instanceId = selectedInstanceData.id;
        const breakpointId = selectedBreakpoint.id;
        for (const update of updates) {
          const matchedIndex = styles.findIndex(
            (item) =>
              item.breakpointId === breakpointId &&
              item.instanceId === instanceId &&
              item.property === update.property
          );

          if (update.operation === "set") {
            const newItem = {
              breakpointId,
              instanceId,
              property: update.property,
              value: update.value,
            };
            if (matchedIndex === -1) {
              styles.push(newItem);
            } else {
              styles[matchedIndex] = newItem;
            }
          }

          if (update.operation === "delete" && matchedIndex !== -1) {
            styles.splice(matchedIndex, 1);
          }
        }
      });
    },
    [publish, selectedBreakpoint, selectedInstanceData]
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
