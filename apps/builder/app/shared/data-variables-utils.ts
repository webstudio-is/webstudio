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

/**
 * Computed store that tracks which instances use each variable
 */
export const $usedVariablesInInstances = computed(
  [$instances, $props, $dataSources],
  (_instances, props, dataSources) => {
    const usedIn = new Map<string, Set<string>>();

    for (const prop of props.values()) {
      if (prop.type === "expression") {
        const code = prop.value;
        for (const dataSource of dataSources.values()) {
          if (dataSource.type === "variable" && code.includes(dataSource.id)) {
            if (!usedIn.has(dataSource.id)) {
              usedIn.set(dataSource.id, new Set());
            }
            usedIn.get(dataSource.id)?.add(prop.instanceId);
          }
        }
      }
    }

    return usedIn;
  }
);
