import {
  collectionComponent,
  elementComponent,
  type Instance,
  type Instances,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import { showAttribute, textContentAttribute } from "@webstudio-is/react-sdk";

type PropValues = ReadonlyMap<string, ReadonlyMap<string, unknown>>;
export type SelectionOverrides = Map<string, Map<string, unknown>>;

/** Resolves one complete, temporary selection layer from unmodified base props. */
export const getSelectionOverrides = ({
  selectedSelector,
  rootInstanceId,
  instances,
  metas,
  propValues,
  indexesWithinAncestors,
}: {
  selectedSelector: InstanceSelector | undefined;
  rootInstanceId: Instance["id"] | undefined;
  instances: Instances;
  metas: ReadonlyMap<string, WsComponentMeta>;
  propValues: PropValues;
  indexesWithinAncestors: ReadonlyMap<Instance["id"], number>;
}): SelectionOverrides => {
  const overrides: SelectionOverrides = new Map();
  if (
    selectedSelector === undefined ||
    rootInstanceId === undefined ||
    instances.has(selectedSelector[0]) === false ||
    selectedSelector.at(-1) !== rootInstanceId
  ) {
    return overrides;
  }

  const path: { instance: Instance; key: string }[] = [];
  const selectedKey = JSON.stringify(selectedSelector);
  // Collection occurrence indexes are selector tokens, not instances.
  for (const [position, id] of selectedSelector.entries()) {
    const instance = instances.get(id);
    if (instance !== undefined) {
      path.push({
        instance,
        key: JSON.stringify(selectedSelector.slice(position)),
      });
      continue;
    }
    const collectionId = selectedSelector[position + 1];
    if (
      instances.get(collectionId)?.component !== collectionComponent ||
      !id.startsWith(`${collectionId}[`) ||
      !id.endsWith("]") ||
      !propValues.has(selectedKey)
    ) {
      return overrides;
    }
  }
  // A stale selector must not reveal an instance after deletion or reparenting.
  for (let index = 0; index < path.length - 1; index += 1) {
    const childId = path[index].instance.id;
    const parent = path[index + 1].instance;
    if (
      !parent.children.some(
        (child) => child.type === "id" && child.value === childId
      )
    ) {
      return overrides;
    }
  }

  const setOverride = (key: string, prop: string, value: unknown) => {
    let instanceOverrides = overrides.get(key);
    if (instanceOverrides === undefined) {
      instanceOverrides = new Map();
      overrides.set(key, instanceOverrides);
    }
    // The closest selected-path rule wins if two rules address one owner prop.
    if (!instanceOverrides.has(prop)) {
      instanceOverrides.set(prop, value);
    }
  };

  for (const [position, { instance, key }] of path.entries()) {
    if (propValues.get(key)?.get(showAttribute) === false) {
      setOverride(key, showAttribute, true);
    }
    const rule = metas.get(instance.component)?.selectionReveal;
    if (rule !== undefined) {
      if (rule.type === "native-option") {
        if (
          instance.component !== "Option" &&
          !(
            instance.component === elementComponent && instance.tag === "option"
          )
        ) {
          continue;
        }
        const owner = path
          .slice(position + 1)
          .find(
            ({ instance }) =>
              instance.component === "Select" ||
              (instance.component === elementComponent &&
                instance.tag === "select")
          );
        if (owner === undefined) {
          continue;
        }
        const props = propValues.get(key);
        // An option without a value uses its text, including evaluated bindings.
        // HTML collapses ASCII whitespace in an option's fallback value.
        const text =
          props?.get(textContentAttribute) ??
          instance.children
            .filter((child) => child.type === "text")
            .map((child) => child.value)
            .join("");
        const value =
          props?.get("value") ??
          String(text)
            .replace(/[\t\n\f\r ]+/g, " ")
            .replace(/^ | $/g, "");
        setOverride(owner.key, "value", value);
        continue;
      }
      if (rule.type === "fixed" && rule.selectedOnly && position !== 0) {
        continue;
      }
      const ownerPosition =
        rule.ancestor === "self"
          ? position
          : path.findIndex(
              ({ instance: ancestor }, index) =>
                index > position && ancestor.component === rule.ancestor
            );
      if (ownerPosition === -1) {
        continue;
      }
      const owner = path[ownerPosition];
      if (rule.type === "fixed") {
        setOverride(owner.key, rule.prop, rule.value);
        continue;
      }
      const sourcePosition =
        rule.source === "self"
          ? position
          : path.findIndex(
              ({ instance: ancestor }, index) =>
                index > position &&
                index < ownerPosition &&
                ancestor.component === rule.source
            );
      const source = path[sourcePosition];
      if (source === undefined) {
        continue;
      }
      const value =
        propValues.get(source.key)?.get(rule.prop) ??
        indexesWithinAncestors.get(source.instance.id)?.toString();
      if (value !== undefined) {
        setOverride(owner.key, rule.prop, value);
      }
    }
  }
  return overrides;
};
