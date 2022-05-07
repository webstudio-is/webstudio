import { useMemo } from "react";
import { type StyleProperty } from "@webstudio-is/sdk";
import {
  useSelectedBreakpoint,
  useSelectedInstanceData,
} from "~/designer/shared/nano-values";
import { getCssRuleForBreakpoint } from "./get-css-rule-for-breakpoint";

/**
 * Identify if the provided property is defined in the instance css rule matching the selected breakpoint.
 */
export const useIsFromCurrentBreakpoint = (property: StyleProperty) => {
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
  if (cssRule === undefined) return false;
  return property in cssRule.style;
};
