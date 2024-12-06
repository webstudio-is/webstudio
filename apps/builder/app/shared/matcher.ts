import type {
  Instance,
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

const isDepthMatchingRelation = (depth: number, relation: MatcherRelation) => {
  return (
    (relation === "self" && depth === 0) ||
    (relation === "parent" && depth === 1) ||
    (relation === "ancestor" && depth >= 1)
  );
};

const isLevelMatchingRelation = (level: number, relation: MatcherRelation) => {
  return (
    (relation === "self" && level === 0) ||
    (relation === "child" && level === 1) ||
    (relation === "descendant" && level >= 1)
  );
};

/**
 * @todo following features are missing
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
  let aborted = false;
  const matchInstance = (instance: Instance, matcher: Matcher) => {
    let matches = isMatching(instance.component, matcher.component);
    if (isNegated(matcher.component)) {
      if (matches) {
        aborted = true;
        return;
      }
      // inverse negated match
      matches = true;
    }
    matchesByMatcher.set(
      matcher,
      (matchesByMatcher.get(matcher) ?? false) || matches
    );
  };
  let index = 0;
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    for (const matcher of queries) {
      if (isDepthMatchingRelation(index, matcher.relation) && instance) {
        matchInstance(instance, matcher);
      }
    }
    index += 1;
  }
  const populateDescendants = (
    instanceId: Instance["id"],
    matcher: Matcher,
    level: number
  ) => {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    // ignore self matchers which already handled above
    if (level > 0 && isLevelMatchingRelation(level, matcher.relation)) {
      matchInstance(instance, matcher);
    }
    for (const child of instance.children) {
      if (child.type === "id") {
        populateDescendants(child.value, matcher, level + 1);
      }
    }
  };
  for (const matcher of queries) {
    // setup default in case no children found
    matchesByMatcher.set(
      matcher,
      // negated operations matches by default
      matchesByMatcher.get(matcher) ?? isNegated(matcher.component)
    );
    populateDescendants(instanceSelector[0], matcher, 0);
  }
  if (aborted) {
    return false;
  }
  return queries.every((matcher) => matchesByMatcher.get(matcher));
};

export const isTreeMatching = ({
  instances,
  metas,
  instanceSelector,
  level = 0,
}: {
  instances: Instances;
  metas: Map<string, WsComponentMeta>;
  instanceSelector: InstanceSelector;
  level?: number;
}): boolean => {
  const [instanceId] = instanceSelector;
  const instance = instances.get(instanceId);
  // collection item can be undefined
  if (instance === undefined) {
    return true;
  }
  const meta = metas.get(instance.component);
  // check self
  let matches = isInstanceMatching({
    instances,
    instanceSelector,
    query: meta?.constraints,
  });
  // check ancestors only on the first run
  if (level === 0) {
    // skip self
    for (let index = 1; index < instanceSelector.length; index += 1) {
      const instance = instances.get(instanceSelector[index]);
      if (instance === undefined) {
        continue;
      }
      const meta = metas.get(instance.component);
      const matches = isInstanceMatching({
        instances,
        instanceSelector: instanceSelector.slice(index),
        query: meta?.constraints,
      });
      if (matches === false) {
        return false;
      }
    }
  }
  if (matches === false) {
    return false;
  }
  for (const child of instance.children) {
    if (child.type === "id") {
      matches = isTreeMatching({
        instances,
        metas,
        instanceSelector: [child.value, ...instanceSelector],
        level: level + 1,
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
