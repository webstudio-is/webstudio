import { computed } from "nanostores";
import {
  $pages,
  $instances,
  $props,
  $dataSources,
  $resources,
} from "~/shared/nano-states";
import { findUsedVariables } from "./data-variables";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";

/**
 * Computed store that tracks usage counts for all variables across the entire project
 */
export const $usedVariablesAcrossProject = computed(
  [$pages, $instances, $props, $dataSources, $resources],
  (pages, instances, props, dataSources, resources) => {
    return findUsedVariables({
      startingInstanceId: ROOT_INSTANCE_ID,
      pages,
      instances,
      props,
      dataSources,
      resources,
    });
  }
);
