import { computed } from "nanostores";
import {
  $pages,
  $instances,
  $props,
  $dataSources,
  $resources,
} from "~/shared/nano-states";
import { findVariableUsagesByInstance } from "./data-variables";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";

/**
 * Computed store that tracks which instances use each variable
 * Returns a Map of variable ID to Set of instance IDs
 */
export const $usedVariablesInInstances = computed(
  [$pages, $instances, $props, $dataSources, $resources],
  (pages, instances, props, dataSources, resources) => {
    return findVariableUsagesByInstance({
      startingInstanceId: ROOT_INSTANCE_ID,
      pages,
      instances,
      props,
      dataSources,
      resources,
    });
  }
);
