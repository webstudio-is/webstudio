import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  getStyleDeclKey,
  type Breakpoints,
  type Instance,
  type Styles,
  type StyleSources,
  type StyleSourceSelections,
} from "@webstudio-is/sdk";
import { nanoid } from "nanoid";

import { isBaseBreakpoint } from "~/shared/nano-states";

export const setListedCssProperty =
  (
    breakpoints: Breakpoints,
    // Mutated
    styleSources: StyleSources,
    styleSourceSelections: StyleSourceSelections,
    styles: Styles
  ) =>
  (instanceId: Instance["id"], property: StyleProperty, value: StyleValue) => {
    if (!styleSourceSelections.has(instanceId)) {
      const styleSourceId = nanoid();
      styleSources.set(styleSourceId, { type: "local", id: styleSourceId });

      styleSourceSelections.set(instanceId, {
        instanceId,
        values: [styleSourceId],
      });
    }

    const styleSourceSelection = styleSourceSelections.get(instanceId)!;

    const localStyleSorceId = styleSourceSelection.values.find(
      (styleSourceId) => styleSources.get(styleSourceId)?.type === "local"
    );

    if (localStyleSorceId === undefined) {
      throw new Error("Local style source not found");
    }

    const baseBreakpoint = Array.from(breakpoints.values()).find(
      isBaseBreakpoint
    );

    if (baseBreakpoint === undefined) {
      throw new Error("Base breakpoint not found");
    }

    const styleKey = getStyleDeclKey({
      breakpointId: baseBreakpoint.id,
      property,
      styleSourceId: localStyleSorceId,
    });

    styles.set(styleKey, {
      breakpointId: baseBreakpoint.id,
      property,
      styleSourceId: localStyleSorceId,
      value,
      listed: true,
    });
  };
