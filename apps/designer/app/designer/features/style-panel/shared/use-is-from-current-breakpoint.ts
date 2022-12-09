import { useMemo } from "react";
import type { StyleProperty } from "@webstudio-is/css-data";
import {
  useSelectedBreakpoint,
  useSelectedInstanceData,
} from "~/designer/shared/nano-states";
import { getCssRuleForBreakpoint } from "./get-css-rule-for-breakpoint";

/**
 * Identify if the provided property is defined in the instance css rule matching the selected breakpoint.
 */
export const useIsFromCurrentBreakpoint = (
  property: StyleProperty | StyleProperty[]
) => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const [selectedInstanceData] = useSelectedInstanceData();
  const cssRule = useMemo(
    () =>
      getCssRuleForBreakpoint(
        selectedInstanceData?.cssRules,
        selectedBreakpoint
      ),
    [selectedInstanceData, selectedBreakpoint]
  );
  if (cssRule === undefined) {
    return false;
  }
  if (Array.isArray(property)) {
    return property.some((property) => property in cssRule.style);
  }
  return property in cssRule.style;
};
