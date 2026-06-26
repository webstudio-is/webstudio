import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  type Breakpoints,
  type Instance,
  type Styles,
  type StyleSources,
  type StyleSourceSelections,
} from "@webstudio-is/sdk";

import { isBaseBreakpoint } from "~/shared/breakpoints-utils";
import { camelCaseProperty } from "@webstudio-is/css-data";
import {
  getOrCreateLocalStyleSourceIdMutable,
  setStyleDeclMutable,
} from "~/shared/style-source-utils";

export const setListedCssProperty =
  (
    breakpoints: Breakpoints,
    // Mutated
    styleSources: StyleSources,
    styleSourceSelections: StyleSourceSelections,
    styles: Styles
  ) =>
  (instanceId: Instance["id"], property: CssProperty, value: StyleValue) => {
    const localStyleSourceId = getOrCreateLocalStyleSourceIdMutable({
      styleSourceSelections,
      styleSources,
      instanceId,
    });

    const baseBreakpoint = Array.from(breakpoints.values()).find(
      isBaseBreakpoint
    );

    if (baseBreakpoint === undefined) {
      throw new Error("Base breakpoint not found");
    }

    setStyleDeclMutable({
      styles,
      breakpointId: baseBreakpoint.id,
      property: camelCaseProperty(property),
      styleSourceId: localStyleSourceId,
      value,
      listed: true,
    });
  };
