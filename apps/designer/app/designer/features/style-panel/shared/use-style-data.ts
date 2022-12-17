import { useState, useMemo, useEffect, useCallback } from "react";
import warnOnce from "warn-once";
import type { SelectedInstanceData, StyleUpdates } from "@webstudio-is/project";
import type { Style, StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { type Publish } from "~/shared/pubsub";
import { useSelectedBreakpoint } from "~/designer/shared/nano-states";
import { getInheritedStyle } from "./get-inherited-style";
import { getCssRuleForBreakpoint } from "./get-css-rule-for-breakpoint";
import { useRootInstance } from "~/shared/nano-states";
// @todo: must be removed, now it's only for compatibility with existing code
import { parseCssValue } from "./parse-css-value";

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

type StyleUpdateOptions = { isEphemeral: boolean };

// @todo: style must have StyleValue type always
export type SetProperty = (
  property: StyleProperty
) => (style: string | StyleValue, options?: StyleUpdateOptions) => void;

export type CreateBatchUpdate = () => {
  setProperty: SetProperty;
  deleteProperty: (property: StyleProperty) => void;
  publish: () => void;
};

export const useStyleData = ({
  selectedInstanceData,
  publish,
}: UseStyleData) => {
  const [rootInstance] = useRootInstance();
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const cssRule = useMemo(
    () =>
      getCssRuleForBreakpoint(
        selectedInstanceData?.cssRules,
        selectedBreakpoint
      ),
    [selectedInstanceData?.cssRules, selectedBreakpoint]
  );

  const getCurrentStyle = useCallback<() => Style>(
    () => ({
      ...selectedInstanceData?.browserStyle,
      ...cssRule?.style,
    }),
    [selectedInstanceData, cssRule]
  );

  const [currentStyle, setCurrentStyle] = useState(() => getCurrentStyle());

  useEffect(() => {
    const currentStyle = getCurrentStyle();
    setCurrentStyle(currentStyle);
  }, [getCurrentStyle]);

  const inheritedStyle = useMemo(() => {
    if (
      currentStyle === undefined ||
      selectedInstanceData === undefined ||
      rootInstance === undefined
    ) {
      return;
    }
    return getInheritedStyle(rootInstance, selectedInstanceData.id);
  }, [currentStyle, selectedInstanceData, rootInstance]);

  const publishUpdates = (
    type: "update" | "preview",
    updates: StyleUpdates["updates"]
  ) => {
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
  };

  // @deprecated should not be called
  const toStyleValue = (property: StyleProperty, value: string) => {
    if (property === "fontFamily") {
      return { type: "fontFamily" as const, value: [value] };
    }

    return parseCssValue(property, value);
  };

  const setProperty: SetProperty = (property) => {
    return (inputOrStyle, options = { isEphemeral: false }) => {
      if (currentStyle === undefined) {
        return;
      }

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

      if (options.isEphemeral === false) {
        setCurrentStyle({ ...currentStyle, [property]: nextValue });
      }
    };
  };

  const deleteProperty = (property: StyleProperty) => {
    if (currentStyle === undefined) {
      return;
    }

    const updates = [{ operation: "delete" as const, property }];
    publishUpdates("update", updates);
    const nextStyle = { ...currentStyle };
    delete nextStyle[property];
    setCurrentStyle(nextStyle);
  };

  const createBatchUpdate = () => {
    let updates: StyleUpdates["updates"] = [];

    const setProperty = (property: StyleProperty) => {
      const setValue = (inputOrStyle: string | StyleValue) => {
        if (currentStyle === undefined) {
          return;
        }

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
      if (currentStyle === undefined) {
        return;
      }

      updates.push({ operation: "delete", property });
    };

    const publish = () => {
      if (!updates.length) {
        return;
      }
      publishUpdates("update", updates);
      const nextStyle = updates.reduce(
        (currentStyle, update) => {
          if (update.operation === "delete") {
            delete currentStyle[update.property];
          }
          if (update.operation === "set") {
            currentStyle[update.property] = update.value;
          }
          return currentStyle;
        },
        { ...currentStyle }
      );
      updates = [];
      setCurrentStyle(nextStyle);
    };

    return {
      setProperty,
      deleteProperty,
      publish,
    };
  };

  return {
    currentStyle,
    inheritedStyle,
    setProperty,
    deleteProperty,
    createBatchUpdate,
  };
};
