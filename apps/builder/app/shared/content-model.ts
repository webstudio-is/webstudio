import { categoriesByTag, childrenByTag } from "@webstudio-is/html-data";
import type {
  Instance,
  Instances,
  Props,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "./tree-utils";

const tagByInstanceIdCache = new WeakMap<Props, Map<Instance["id"], string>>();

const getTagByInstanceId = (props: Props) => {
  let tagByInstanceId = tagByInstanceIdCache.get(props);
  if (tagByInstanceId === undefined) {
    tagByInstanceId = new Map<Instance["id"], string>();
    for (const prop of props.values()) {
      if (prop.type === "string" && prop.name === "tag") {
        tagByInstanceId.set(prop.instanceId, prop.value);
      }
    }
    tagByInstanceIdCache.set(props, tagByInstanceId);
  }
  return tagByInstanceId;
};

const getMetaTag = (meta: undefined | WsComponentMeta) => {
  return Object.keys(meta?.presetStyle ?? {}).at(0);
};

const isIntersected = (arrayA: string[], arrayB: string[]) => {
  return arrayA.some((item) => arrayB.includes(item));
};

const isTagSatisfyingContentModel = ({
  tag,
  allowedCategories,
}: {
  tag: undefined | string;
  allowedCategories: undefined | string[];
}) => {
  // slot or collection does not have tag and should pass through allowed categories
  if (tag === undefined) {
    return true;
  }
  // body does not have parent
  if (allowedCategories === undefined) {
    return true;
  }
  // for example ul has "li" as children category
  if (allowedCategories.includes(tag)) {
    return true;
  }
  // instance does not match parent constraints
  if (isIntersected(allowedCategories, categoriesByTag[tag]) === false) {
    return false;
  }
  // prevent accepting interactive when ancestor enforced non-interactive elements
  if (
    allowedCategories.includes("non-interactive") &&
    categoriesByTag[tag].includes("interactive")
  ) {
    return false;
  }
  // prevent accepting form when ancestor enforced non-form elements
  if (allowedCategories.includes("non-form") && tag === "form") {
    return false;
  }
  return true;
};

const getTagChildren = (
  tag: undefined | string,
  allowedCategories: undefined | string[]
) => {
  // components without tag behave like transparent category
  // and pass through parent constraint
  let childrenCategories: string[] =
    tag === undefined ? ["transparent"] : childrenByTag[tag];
  if (childrenCategories.includes("transparent") && allowedCategories) {
    childrenCategories = allowedCategories;
  }
  // introduce custom non-interactive category to restrict nesting interactive elements
  if (
    tag &&
    (categoriesByTag[tag].includes("interactive") ||
      allowedCategories?.includes("non-interactive"))
  ) {
    childrenCategories = [...childrenCategories, "non-interactive"];
  }
  // introduce custom non-form category to restrict nesting form elements
  if (tag === "form" || allowedCategories?.includes("non-form")) {
    childrenCategories = [...childrenCategories, "non-form"];
  }
  return childrenCategories;
};

/**
 * compute allowed categories for specified selector
 * to consider transparent and interactive categories
 */
const computeAllowedCategories = ({
  instances,
  props,
  metas,
  instanceSelector,
}: {
  instances: Instances;
  props: Props;
  metas: Map<Instance["component"], WsComponentMeta>;
  instanceSelector: InstanceSelector;
}) => {
  let instance: undefined | Instance;
  let allowedCategories: undefined | string[];
  // skip selected instance for which these constraints are computed
  for (const instanceId of instanceSelector.slice(1).reverse()) {
    instance = instances.get(instanceId);
    // collection item can be undefined
    if (instance === undefined) {
      continue;
    }
    const tagByInstanceId = getTagByInstanceId(props);
    const meta = metas.get(instance.component);
    const tag = tagByInstanceId.get(instance.id) ?? getMetaTag(meta);
    allowedCategories = getTagChildren(tag, allowedCategories);
  }
  return allowedCategories;
};

export const isTreeSatisfyingContentModel = ({
  instances,
  props,
  metas,
  instanceSelector,
  _allowedCategories: allowedCategories,
}: {
  instances: Instances;
  props: Props;
  metas: Map<Instance["component"], WsComponentMeta>;
  instanceSelector: InstanceSelector;
  _allowedCategories?: string[];
}): boolean => {
  // compute constraints only when not passed from parent
  allowedCategories ??= computeAllowedCategories({
    instanceSelector,
    instances,
    props,
    metas,
  });
  const [instanceId] = instanceSelector;
  const instance = instances.get(instanceId);
  // collection item can be undefined
  if (instance === undefined) {
    return true;
  }
  const tagByInstanceId = getTagByInstanceId(props);
  const meta = metas.get(instance.component);
  const tag = tagByInstanceId.get(instance.id) ?? getMetaTag(meta);
  let isSatisfying = isTagSatisfyingContentModel({
    tag,
    allowedCategories,
  });
  const childrenCategories: string[] = getTagChildren(tag, allowedCategories);
  for (const child of instance.children) {
    if (child.type === "id") {
      isSatisfying &&= isTreeSatisfyingContentModel({
        instances,
        props,
        metas,
        instanceSelector: [child.value, ...instanceSelector],
        _allowedCategories: childrenCategories,
      });
    }
  }
  return isSatisfying;
};
