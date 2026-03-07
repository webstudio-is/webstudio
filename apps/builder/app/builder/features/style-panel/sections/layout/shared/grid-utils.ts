import type {
  Instance,
  StyleSource,
  StyleSourceSelections,
  StyleSources,
  Styles,
} from "@webstudio-is/sdk";
import type { StyleProperty } from "@webstudio-is/css-engine";

const gridPlacementProperties: ReadonlySet<StyleProperty> = new Set([
  "gridColumnStart",
  "gridColumnEnd",
  "gridRowStart",
  "gridRowEnd",
]);

/**
 * Check if an instance is auto-placed in a grid by examining its local styles.
 * Returns true when no grid placement property has a non-auto value.
 */
export const isAutoGridPlacement = ({
  styles,
  styleSources,
  styleSourceSelections,
  instanceId,
}: {
  styles: Styles;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  instanceId: Instance["id"];
}): boolean => {
  const selection = styleSourceSelections.get(instanceId);
  if (selection === undefined) {
    return true;
  }
  const localIds = new Set<StyleSource["id"]>();
  for (const id of selection.values) {
    if (styleSources.get(id)?.type === "local") {
      localIds.add(id);
    }
  }
  if (localIds.size === 0) {
    return true;
  }
  for (const styleDecl of styles.values()) {
    if (localIds.has(styleDecl.styleSourceId) === false) {
      continue;
    }
    if (gridPlacementProperties.has(styleDecl.property) === false) {
      continue;
    }
    if (
      styleDecl.value.type === "keyword" &&
      styleDecl.value.value === "auto"
    ) {
      continue;
    }
    return false;
  }
  return true;
};

/**
 * Remove grid placement styles from an instance's local style sources.
 * Used after duplication to prevent overlapping grid children.
 */
export const resetGridChildPlacement = ({
  styles,
  styleSources,
  styleSourceSelections,
  instanceId,
}: {
  styles: Styles;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  instanceId: Instance["id"];
}) => {
  const selection = styleSourceSelections.get(instanceId);
  if (selection === undefined) {
    return;
  }
  const localIds = new Set<StyleSource["id"]>();
  for (const id of selection.values) {
    if (styleSources.get(id)?.type === "local") {
      localIds.add(id);
    }
  }
  for (const [key, styleDecl] of styles) {
    if (localIds.has(styleDecl.styleSourceId) === false) {
      continue;
    }
    if (gridPlacementProperties.has(styleDecl.property)) {
      styles.delete(key);
    }
  }
};
