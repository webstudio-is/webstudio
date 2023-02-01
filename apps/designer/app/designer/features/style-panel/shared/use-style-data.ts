import { useCallback } from "react";
import ObjectID from "bson-objectid";
import store from "immerhin";
import warnOnce from "warn-once";
import type { Instance, Tree } from "@webstudio-is/project-build";
import type { StyleUpdates } from "@webstudio-is/project";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { type Publish } from "~/shared/pubsub";
import {
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
} from "~/shared/nano-states";
import { useSelectedBreakpoint } from "~/designer/shared/nano-states";
import {
  removeByMutable,
  replaceByOrAppendMutable,
} from "~/shared/array-utils";
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
  treeId: Tree["id"];
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

export const useStyleData = ({
  treeId,
  selectedInstance,
  publish,
}: UseStyleData) => {
  const [selectedBreakpoint] = useSelectedBreakpoint();

  const currentStyle = useStyleInfo();

  const publishUpdates = useCallback(
    (type: "update" | "preview", updates: StyleUpdates["updates"]) => {
      if (updates.length === 0 || selectedBreakpoint === undefined) {
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

          // crate style source and its selection on currently selected instance
          const matchedStyleSourceSelection = styleSourceSelections.find(
            (styleSourceSelection) =>
              styleSourceSelection.instanceId === instanceId
          );
          if (matchedStyleSourceSelection === undefined) {
            const styleSourceId = ObjectID.toString();
            styleSources.push({
              type: "local",
              id: styleSourceId,
              treeId,
            });
            styleSourceSelections.push({
              instanceId,
              values: [styleSourceId],
            });
          }

          for (const update of updates) {
            if (update.operation === "set") {
              replaceByOrAppendMutable(
                styles,
                {
                  breakpointId,
                  instanceId,
                  property: update.property,
                  value: update.value,
                },
                (item) =>
                  item.instanceId === instanceId &&
                  item.breakpointId === breakpointId &&
                  item.property === update.property
              );
            }

            if (update.operation === "delete") {
              removeByMutable(
                styles,
                (item) =>
                  item.instanceId === instanceId &&
                  item.breakpointId === breakpointId &&
                  item.property === update.property
              );
            }
          }
        }
      );
    },
    [publish, selectedBreakpoint, selectedInstance, treeId]
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
