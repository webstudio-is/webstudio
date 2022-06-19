import { useState, useMemo, useEffect, useCallback } from "react";
import type {
  SelectedInstanceData,
  StyleUpdates,
} from "~/shared/canvas-components";
import { type StyleProperty, type Publish } from "@webstudio-is/sdk";
import { useSelectedBreakpoint } from "../../shared/nano-states";
import { parseCssValue } from "./parse-css-value";
import { getInheritedStyle } from "./get-inherited-style";
import { getCssRuleForBreakpoint } from "./lib/utils/get-css-rule-for-breakpoint";
import { useRootInstance } from "~/shared/nano-states";

type UseStyleData = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

type StyleUpdateOptions = { isEphemeral: boolean };

export type SetProperty = (
  property: StyleProperty
) => (value: string, options?: StyleUpdateOptions) => void;

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

  const [currentStyle, setCurrentStyle] = useState(getCurrentStyle());

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
    publish<string, StyleUpdates>({
      type:
        type === "update"
          ? "updateStyle"
          : `previewStyle:${selectedInstanceData.id}`,
      payload: {
        id: selectedInstanceData.id,
        updates,
        breakpoint: selectedBreakpoint,
      },
    });
  };

  const setProperty: SetProperty = (property) => {
    return (input, options = { isEphemeral: false }) => {
      if (currentStyle === undefined) return;
      const currentValue = currentStyle[property];
      const defaultUnit =
        currentValue?.type === "unit" ? currentValue?.unit : undefined;
      const nextValue = parseCssValue(property, input, defaultUnit);
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

  return { currentStyle, inheritedStyle, setProperty };
};
