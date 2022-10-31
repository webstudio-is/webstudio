import { useState, useMemo, useEffect, useCallback } from "react";
import type {
  SelectedInstanceData,
  StyleUpdates,
} from "~/shared/canvas-components";
import { Instance, type StyleProperty } from "@webstudio-is/react-sdk";
import { type Publish } from "~/shared/pubsub";
import { useSelectedBreakpoint } from "~/designer/shared/nano-states";
import { parseCssValue } from "./parse-css-value";
import { getInheritedStyle } from "./get-inherited-style";
import { getCssRuleForBreakpoint } from "./get-css-rule-for-breakpoint";
import { useRootInstance } from "~/shared/nano-states";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateStyle: StyleUpdates;
    [key: `previewStyle:${Instance["id"]}`]: StyleUpdates;
  }
}

type UseStyleData = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

type StyleUpdateOptions = { isEphemeral: boolean };

export type SetProperty = (
  property: StyleProperty
) => (value: string, options?: StyleUpdateOptions) => void;

export type CreateBatchUpdate = () => {
  setProperty: SetProperty;
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

  const getCurrentStyle = useCallback(
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
      selectedBreakpoint == undefined
    ) {
      return;
    }
    publish({
      type:
        type === "update"
          ? "updateStyle"
          : (`previewStyle:${selectedInstanceData.id}` as const),
      payload: {
        id: selectedInstanceData.id,
        updates,
        breakpoint: selectedBreakpoint,
      },
    });
  };

  const toStyleValue = (property: StyleProperty, value: string) => {
    if (currentStyle === undefined) return;
    if (property === "fontFamily") {
      return { type: "fontFamily" as const, value: [value] };
    }
    return parseCssValue(property, value, "number");
  };

  const setProperty: SetProperty = (property) => {
    return (input, options = { isEphemeral: false }) => {
      const nextValue = toStyleValue(property, input);
      if (nextValue === undefined) return;
      if (nextValue.type !== "invalid") {
        const updates = [{ property, value: nextValue }];
        const type = options.isEphemeral ? "preview" : "update";
        publishUpdates(type, updates);
      }
      if (options.isEphemeral === false) {
        setCurrentStyle({ ...currentStyle, [property]: nextValue });
      }
    };
  };

  const createBatchUpdate = () => {
    let updates: StyleUpdates["updates"] = [];

    const setProperty = (property: StyleProperty) => {
      const setValue = (input: string) => {
        const value = toStyleValue(property, input);
        if (value === undefined || value.type === "invalid") {
          return;
        }
        updates.push({ property, value });
      };
      return setValue;
    };

    const publish = () => {
      if (!updates.length) return;
      publishUpdates("update", updates);
      const nextStyle = updates.reduce(
        (currentStyle, { property, value }) => {
          currentStyle[property] = value;
          return currentStyle;
        },
        { ...currentStyle }
      );
      updates = [];
      setCurrentStyle(nextStyle);
    };

    return {
      setProperty,
      publish,
    };
  };

  return { currentStyle, inheritedStyle, setProperty, createBatchUpdate };
};
