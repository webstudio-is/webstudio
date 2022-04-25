import { useState, useMemo, useEffect } from "react";
import type { SelectedInstanceData, StyleUpdates } from "~/shared/component";
import {
  type Breakpoint,
  type Style,
  type StyleProperty,
} from "@webstudio-is/sdk";
import { type Publish } from "~/designer/shared/canvas-iframe";
import {
  useRootInstance,
  useSelectedBreakpoint,
} from "../../shared/nano-values";
import { parseCssValue } from "./parse-css-value";
import { getInheritedStyle, type InheritedStyle } from "./get-inherited-style";

type UseStyleData = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

type StyleUpdateOptions = { isEphemeral: boolean };

export type SetProperty = (
  property: StyleProperty
) => (value: string, options?: StyleUpdateOptions) => void;

const getCurrentStyle = (
  {
    cssRules,
    browserStyle,
  }: Pick<SelectedInstanceData, "cssRules" | "browserStyle"> = {
    cssRules: [],
    browserStyle: {},
  },
  breakpoint?: Breakpoint
) => {
  if (breakpoint === undefined) return browserStyle;
  const cssRule = cssRules.find(
    (cssRule) => cssRule.breakpoint === breakpoint.id
  );
  if (cssRule === undefined) return browserStyle;
  return {
    ...browserStyle,
    ...cssRule.style,
  };
};

export const useStyleData = ({
  selectedInstanceData,
  publish,
}: UseStyleData): [Style | void, InheritedStyle | void, SetProperty] => {
  const [rootInstance] = useRootInstance();
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const [currentStyle, setCurrentStyle] = useState<Style | undefined>(
    getCurrentStyle(selectedInstanceData, selectedBreakpoint)
  );
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

  useEffect(() => {
    setCurrentStyle(getCurrentStyle(selectedInstanceData, selectedBreakpoint));
  }, [selectedInstanceData, selectedBreakpoint]);

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
      setCurrentStyle({ ...currentStyle, [property]: nextValue });
    };
  };

  return [currentStyle, inheritedStyle, setProperty];
};
