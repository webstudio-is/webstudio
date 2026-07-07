import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  type Breakpoints,
  type Instance,
  type Styles,
  type StyleSources,
  type StyleSourceSelections,
} from "@webstudio-is/sdk";
import { nanoid } from "nanoid";

import { isBaseBreakpoint } from "@webstudio-is/project-build/runtime/breakpoints";
import { camelCaseProperty } from "@webstudio-is/css-data";
import { createStyleDeclarationUpdatePayload } from "@webstudio-is/project-build/runtime/styles";
import { applyBuilderPatchPayloadMutable } from "~/shared/instance-utils/data";

export const setListedCssProperty =
  (
    breakpoints: Breakpoints,
    // Mutated
    styleSources: StyleSources,
    styleSourceSelections: StyleSourceSelections,
    styles: Styles
  ) =>
  (instanceId: Instance["id"], property: CssProperty, value: StyleValue) => {
    const baseBreakpoint = Array.from(breakpoints.values()).find(
      isBaseBreakpoint
    );

    if (baseBreakpoint === undefined) {
      throw new Error("Base breakpoint not found");
    }

    applyBuilderPatchPayloadMutable(
      { styleSourceSelections, styleSources, styles },
      createStyleDeclarationUpdatePayload({
        updates: [
          {
            instanceId,
            breakpoint: baseBreakpoint.id,
            property: camelCaseProperty(property),
            value,
            listed: true,
            createLocalIfMissing: true,
          },
        ],
        styleSources,
        styleSourceSelections: styleSourceSelections.values(),
        styles: styles.values(),
        createId: nanoid,
      }).payload
    );
  };
