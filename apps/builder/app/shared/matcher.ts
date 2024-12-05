import type {
  Instances,
  Matcher,
  MatcherOperation,
  MatcherRelation,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "./tree-utils";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";

const isNegated = (operation?: MatcherOperation) => {
  return operation?.$neq !== undefined || operation?.$nin !== undefined;
};

const isMatching = (
  value: undefined | string,
  operation: undefined | MatcherOperation
) => {
  if (operation?.$eq) {
    return operation.$eq === value;
  }
  if (operation?.$neq) {
    return operation.$neq === value;
  }
  if (operation?.$in && value) {
    return operation.$in.includes(value);
  }
  if (operation?.$nin && value) {
    return operation.$nin.includes(value);
  }
  return false;
};

const isRelationMatching = (index: number, relation: MatcherRelation) => {
  return (
    (relation === "self" && index === 0) ||
    (relation === "parent" && index === 1) ||
    (relation === "ancestor" && index >= 1)
  );
};

/**
 * @todo following features are missing
 * - child matcher
 * - descendant matcher
 * - tag matcher
 */
export const isInstanceMatching = ({
  instances,
  instanceSelector,
  query,
}: {
  instances: Instances;
  instanceSelector: InstanceSelector;
  query: undefined | Matcher | Matcher[];
}): boolean => {
  // fast path to the lack of constraints
  if (query === undefined) {
    return true;
  }
  const queries = Array.isArray(query) ? query : [query];
  const matchesByMatcher = new Map<Matcher, boolean>();
  let index = 0;
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    for (const matcher of queries) {
      const { relation, component } = matcher;
      if (isRelationMatching(index, relation)) {
        let matches = isMatching(instance?.component, component);
        if (isNegated(component)) {
          if (matches) {
            return false;
          }
          // inverse negated match
          matches = true;
        }
        matchesByMatcher.set(
          matcher,
          (matchesByMatcher.get(matcher) ?? false) || matches
        );
      }
    }
    index += 1;
  }
  return Array.from(matchesByMatcher.values()).every((matched) => matched);
};

export const isTreeMatching = ({
  instances,
  metas,
  instanceSelector,
}: {
  instances: Instances;
  metas: Map<string, WsComponentMeta>;
  instanceSelector: InstanceSelector;
}): boolean => {
  const [instanceId] = instanceSelector;
  const instance = instances.get(instanceId);
  // collection item can be undefined
  if (instance === undefined) {
    return true;
  }
  const meta = metas.get(instance.component);
  let matches = isInstanceMatching({
    instances,
    instanceSelector,
    query: meta?.constraints,
  });
  if (matches === false) {
    return false;
  }
  for (const child of instance.children) {
    if (child.type === "id") {
      matches = isTreeMatching({
        instances,
        metas,
        instanceSelector: [child.value, ...instanceSelector],
      });
      if (matches === false) {
        return false;
      }
    }
  }
  return matches;
};

export const findClosestInstanceMatchingFragment = ({
  instances,
  metas,
  instanceSelector,
  fragment,
}: {
  instances: Instances;
  metas: Map<string, WsComponentMeta>;
  instanceSelector: InstanceSelector;
  fragment: WebstudioFragment;
}) => {
  const mergedInstances = new Map(instances);
  for (const instance of fragment.instances) {
    mergedInstances.set(instance.id, instance);
  }
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance = instances.get(instanceId);
    // collection item can be undefined
    if (instance === undefined) {
      continue;
    }
    const meta = metas.get(instance.component);
    if (meta === undefined) {
      continue;
    }
    let matches = true;
    for (const child of fragment.children) {
      if (child.type === "id") {
        matches &&= isTreeMatching({
          instances: mergedInstances,
          metas,
          instanceSelector: [child.value, ...instanceSelector.slice(index)],
        });
      }
    }
    if (matches) {
      return index;
    }
  }
  return -1;
};

export const findClosestContainer = ({
  metas,
  instances,
  instanceSelector,
}: {
  metas: Map<string, WsComponentMeta>;
  instances: Instances;
  instanceSelector: InstanceSelector;
}) => {
  // page root with text can be used as container
  if (instanceSelector.length === 1) {
    return 0;
  }
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance = instances.get(instanceId);
    // collection item can be undefined
    if (instance === undefined) {
      continue;
    }
    const meta = metas.get(instance.component);
    if (meta === undefined) {
      continue;
    }
    let hasText = false;
    for (const child of instance.children) {
      if (child.type === "text" || child.type === "expression") {
        hasText = true;
      }
    }
    if (hasText) {
      continue;
    }
    if (meta.type === "container") {
      return index;
    }
  }
  return -1;
};
