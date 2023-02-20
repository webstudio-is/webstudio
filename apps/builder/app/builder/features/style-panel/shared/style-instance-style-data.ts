import { useStore } from "@nanostores/react";
import { properties, Style, StyleProperty } from "@webstudio-is/css-data";
import type { Instance } from "@webstudio-is/project-build";
import { useMemo } from "react";
import {
  stylesIndexStore,
  useBreakpoints,
  useRootInstance,
} from "~/shared/nano-states";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";
import {
  getCascadedBreakpointIds,
  getCascadedInfo,
  getInheritedInfo,
} from "./style-info";

const styleProperties = Object.keys(properties) as StyleProperty[];

export const useInstanceStyleData = (
  instanceId: Instance["id"] | undefined
) => {
  const [rootInstance] = useRootInstance();
  const { stylesByInstanceId } = useStore(stylesIndexStore);
  const [breakpoints] = useBreakpoints();
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const selectedBreakpointId = selectedBreakpoint?.id;

  const cascadedBreakpointIds = useMemo(
    () => getCascadedBreakpointIds(breakpoints, selectedBreakpointId),
    [breakpoints, selectedBreakpointId]
  );

  const selftAndCascadeInfo = useMemo(() => {
    if (instanceId === undefined || selectedBreakpointId === undefined) {
      return {};
    }
    return getCascadedInfo(stylesByInstanceId, instanceId, [
      ...cascadedBreakpointIds,
      selectedBreakpointId,
    ]);
  }, [
    stylesByInstanceId,
    instanceId,
    cascadedBreakpointIds,
    selectedBreakpointId,
  ]);

  const inheritedInfo = useMemo(() => {
    if (
      rootInstance === undefined ||
      selectedBreakpointId === undefined ||
      instanceId === undefined
    ) {
      return {};
    }
    return getInheritedInfo(
      rootInstance,
      stylesByInstanceId,
      instanceId,
      cascadedBreakpointIds,
      selectedBreakpointId
    );
  }, [
    rootInstance,
    stylesByInstanceId,
    cascadedBreakpointIds,
    selectedBreakpointId,
    instanceId,
  ]);

  const styleData = useMemo(() => {
    const styleData: Style = {};
    for (const property of styleProperties) {
      // temporary solution until we start computing all styles from data
      const inherited = inheritedInfo[property];
      const cascaded = selftAndCascadeInfo[property];
      const value = cascaded?.value ?? inherited?.value;

      if (value) {
        styleData[property] = value;
      }
    }
    return styleData;
  }, [selftAndCascadeInfo, inheritedInfo]);

  return styleData;
};
