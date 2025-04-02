import {
  categoriesByTag,
  childrenCategoriesByTag,
} from "@webstudio-is/html-data";
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

/**
 * checks if tag has interactive category
 * though img is an exception and historically its interactivity ignored
 * so img can be put into links and buttons
 */
const isTagInteractive = (tag: string) => {
  return tag !== "img" && categoriesByTag[tag].includes("interactive");
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
  // very big hack to support putting div into buttons or headings
  // users put "Embed HTML" all over the place to embed icons
  // radix templates do it as well
  if (allowedCategories.includes("phrasing") && tag === "div") {
    return true;
  }
  // instance does not match parent constraints
  if (isIntersected(allowedCategories, categoriesByTag[tag]) === false) {
    return false;
  }
  // prevent nesting interactive elements
  // like button > button or a > input
  if (allowedCategories.includes("non-interactive") && isTagInteractive(tag)) {
    // interactive exception, label > input is not recommended but a popular case
    // to automatically focus input when click on label text without using id
    if (allowedCategories.includes("label-content") && tag === "input") {
      return true;
    }
    return false;
  }
  // prevent nesting form elements
  // like form > div > form
  if (allowedCategories.includes("non-form") && tag === "form") {
    return false;
  }
  return true;
};

/**
 * compute possible categories for tag children
 */
const getTagChildrenCategories = (
  tag: undefined | string,
  allowedCategories: undefined | string[]
) => {
  // components without tag behave like transparent category
  // and pass through parent constraints
  let childrenCategories: string[] =
    tag === undefined ? ["transparent"] : childrenCategoriesByTag[tag];
  if (childrenCategories.includes("transparent") && allowedCategories) {
    childrenCategories = allowedCategories;
  }
  // introduce custom non-interactive category to restrict nesting interactive elements
  // like button > button or a > input
  if (
    tag &&
    (isTagInteractive(tag) || allowedCategories?.includes("non-interactive"))
  ) {
    childrenCategories = [...childrenCategories, "non-interactive"];
  }
  // interactive exception, label > input is not recommended but a popular case
  // to automatically focus input when click on label text without using id
  if (tag === "label" || allowedCategories?.includes("label-content")) {
    childrenCategories = [...childrenCategories, "label-content"];
  }
  // introduce custom non-form category to restrict nesting form elements
  // like form > div > form
  if (tag === "form" || allowedCategories?.includes("non-form")) {
    childrenCategories = [...childrenCategories, "non-form"];
  }
  return childrenCategories;
};

/**
 * compute allowed categories from all ancestors
 * considering inherited (transparent) categories
 * and other ancestor specific behaviors
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
    allowedCategories = getTagChildrenCategories(tag, allowedCategories);
  }
  return allowedCategories;
};

/**
 * Check all tags starting with specified instance select
 * for example
 *
 * Most rules are described by categoriesByTag and childrenCategoriesByTag
 * from html-data package. Basically all elements enforce children categories
 * and all elements has own categories. We check intersections to match them.
 *
 * See https://html.spec.whatwg.org/multipage/indices.html#elements-3
 *
 * div > span = true
 * where div is flow category
 * and requires flow or phrasing category in children
 * span is flow and phrasing category
 * and requires phrasing in children
 *
 * span > div = false
 * because span requires phrasing category in children
 *
 * p > div = false
 * because paragraph also requires phrasing category in children
 *
 * Interactive categories and form elements are exception
 * because button requires phrasing children
 * and does not prevent nesting interactive elements by content model
 * They pass through negative categories
 *
 * [categories]  [children]
 * interactive   non-interactive
 *
 * exampeles
 * button > input = false
 * form > div > form = false
 *
 */
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
  const childrenCategories: string[] = getTagChildrenCategories(
    tag,
    allowedCategories
  );
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
