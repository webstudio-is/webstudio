import {
  blockComponent,
  blockTemplateComponent,
  findContentBlockBodyContainers,
  findWritableContentBlockDocumentBindings,
  getHtmlTagsFromProps,
  getHtmlTagFromInstance,
  type Breakpoints,
  type Instance,
  type Prop,
  type PropMeta,
  type Props,
  type StyleSourceSelections,
  type StyleSources,
  type Styles,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { findProp, getMediaAssetPropNames } from "./props";

export type ContentModeCapabilities = {
  editablePropIds: Set<Prop["id"]>;
  editableInstanceIds: Set<Instance["id"]>;
  instances: Map<Instance["id"], Instance>;
  metas: Map<Instance["component"], WsComponentMeta>;
  props: Props;
  htmlTagsByInstanceId: Map<Instance["id"], string>;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
  breakpoints?: Breakpoints;
  contentRootIds: Set<Instance["id"]>;
  frontmatterBoundPropIds?: ReadonlySet<Prop["id"]>;
  frontmatterBoundTextInstanceIds?: ReadonlySet<Instance["id"]>;
};

export const getContentModePropNamesByTag = (
  metas: Map<Instance["component"], WsComponentMeta>
) => {
  const propNamesByTag = new Map<string, Set<Prop["name"]>>();

  for (const meta of metas.values()) {
    const tags = Object.keys(meta.presetStyle ?? {});
    if (tags.length === 0) {
      continue;
    }
    for (const [propName, propMeta] of Object.entries(meta.props ?? {})) {
      if (propMeta.contentMode !== true) {
        continue;
      }
      for (const tag of tags) {
        let propNames = propNamesByTag.get(tag);
        if (propNames === undefined) {
          propNames = new Set();
          propNamesByTag.set(tag, propNames);
        }
        propNames.add(propName);
      }
    }
  }

  return propNamesByTag;
};

const getDefaultContentRootIds = (instances: Map<Instance["id"], Instance>) => {
  const contentRootIds = new Set<Instance["id"]>();
  for (const instance of instances.values()) {
    if (instance.component === blockComponent) {
      const bodies = findContentBlockBodyContainers({
        blockInstance: instance,
        instances,
      });
      if (bodies.length === 1) {
        contentRootIds.add(bodies[0].id);
      } else if (bodies.length === 0) {
        contentRootIds.add(instance.id);
      }
    }
  }
  return contentRootIds;
};

export const getContentModeFrontmatterBoundTargets = ({
  instances,
  props,
}: {
  instances: Map<Instance["id"], Instance>;
  props: Props;
}) => {
  const bindings = findWritableContentBlockDocumentBindings({
    instances,
    props,
  });
  const propIds = new Set(bindings.props.map(({ propId }) => propId));
  const textInstanceIds = new Set<Instance["id"]>();
  for (const { instanceId, childIndex } of bindings.children) {
    if (childIndex === 0 && instances.get(instanceId)?.children.length === 1) {
      textInstanceIds.add(instanceId);
    }
  }
  return { propIds, textInstanceIds };
};

export const getContentModeEditableInstanceIds = ({
  contentRootIds,
  instances,
}: {
  contentRootIds?: Set<Instance["id"]>;
  instances: Map<Instance["id"], Instance>;
}) => {
  contentRootIds ??= getDefaultContentRootIds(instances);
  return new Set(
    getContentModeEditableInstanceRootIds({
      contentRootIds,
      instances,
    }).keys()
  );
};

export const getContentModeEditableInstanceRootIds = ({
  contentRootIds,
  instances,
}: {
  contentRootIds: Set<Instance["id"]>;
  instances: Map<Instance["id"], Instance>;
}) => {
  const editableInstanceIds = new Set<Instance["id"]>();
  const rootIdsByInstanceId = new Map<Instance["id"], Instance["id"]>();
  const visit = (instanceId: Instance["id"], rootId: Instance["id"]) => {
    if (editableInstanceIds.has(instanceId)) {
      return;
    }
    const instance = instances.get(instanceId);
    if (
      instance === undefined ||
      instance.component === blockTemplateComponent
    ) {
      return;
    }
    editableInstanceIds.add(instanceId);
    rootIdsByInstanceId.set(instanceId, rootId);
    for (const child of instance.children ?? []) {
      if (child.type === "id") {
        visit(child.value, rootId);
      }
    }
  };
  for (const rootId of contentRootIds) {
    visit(rootId, rootId);
  }
  return rootIdsByInstanceId;
};

const contentModeNonCopyablePropTypes = new Set<Prop["type"]>([
  "resource",
  "parameter",
  "expression",
  "action",
  "animationAction",
]);

const getInstancePropMetas = ({
  capabilities,
  instance,
  propName,
}: {
  capabilities: ContentModeCapabilities;
  instance: Instance;
  propName: Prop["name"];
}) => {
  const propMetas: PropMeta[] = [];
  const propMeta = capabilities.metas.get(instance.component)?.props?.[
    propName
  ];
  if (propMeta !== undefined) {
    propMetas.push(propMeta);
  }

  const tag = getHtmlTagFromInstance({
    instance,
    metas: capabilities.metas,
    props: capabilities.props,
    htmlTagsByInstanceId: capabilities.htmlTagsByInstanceId,
  });
  if (tag === undefined) {
    return propMetas;
  }
  for (const componentMeta of capabilities.metas.values()) {
    if (Object.keys(componentMeta.presetStyle ?? {}).includes(tag) === false) {
      continue;
    }
    const propMeta = componentMeta.props?.[propName];
    if (propMeta !== undefined) {
      propMetas.push(propMeta);
    }
  }
  return propMetas;
};

export const getContentModeEditableStaticPropNames = ({
  capabilities,
  instance,
}: {
  capabilities: ContentModeCapabilities;
  instance: Instance;
}) => {
  const names = new Set<string>();
  for (const [name, propMeta] of Object.entries(
    capabilities.metas.get(instance.component)?.props ?? {}
  )) {
    if (
      propMeta.contentMode === true &&
      (propMeta.type === "string" ||
        propMeta.type === "number" ||
        propMeta.type === "boolean")
    ) {
      names.add(name);
    }
  }
  const tag = getHtmlTagFromInstance({
    instance,
    metas: capabilities.metas,
    props: capabilities.props,
    htmlTagsByInstanceId: capabilities.htmlTagsByInstanceId,
  });
  if (tag !== undefined) {
    for (const name of getContentModePropNamesByTag(capabilities.metas).get(
      tag
    ) ?? []) {
      if (
        getInstancePropMetas({ capabilities, instance, propName: name }).some(
          (propMeta) =>
            propMeta.contentMode === true &&
            (propMeta.type === "string" ||
              propMeta.type === "number" ||
              propMeta.type === "boolean")
        )
      ) {
        names.add(name);
      }
    }
  }
  return names;
};

export type ContentModePropEligibility =
  | { editable: true }
  | {
      editable: false;
      reason: "unknown" | "incompatible" | "design-only";
    };

export const getContentModePropEligibility = ({
  capabilities,
  instance,
  prop,
  props = capabilities.props,
}: {
  capabilities: ContentModeCapabilities;
  instance: Instance;
  prop: Pick<Prop, "name" | "type"> & Partial<Pick<Prop, "value">>;
  props?: Props;
}): ContentModePropEligibility => {
  if (
    prop.type === "asset" &&
    getMediaAssetPropNames(instance.component).includes(prop.name)
  ) {
    const source = findProp(props.values(), instance.id, "src");
    if (source?.type === "asset" && source.value === prop.value) {
      return { editable: true };
    }
  }
  const propMetas = getInstancePropMetas({
    capabilities,
    instance,
    propName: prop.name,
  });
  const contentModePropMeta = propMetas.find(
    (propMeta) => propMeta.contentMode === true
  );
  if (contentModePropMeta === undefined) {
    return {
      editable: false,
      reason: propMetas.length === 0 ? "unknown" : "design-only",
    };
  }
  if (
    contentModePropMeta.type !== prop.type &&
    !(prop.type === "asset" && contentModePropMeta.type === "string")
  ) {
    return { editable: false, reason: "incompatible" };
  }
  return { editable: true };
};

export const isContentModeCopyableProp = ({
  capabilities,
  prop,
}: {
  capabilities: ContentModeCapabilities;
  prop: Prop;
}) =>
  capabilities.editablePropIds.has(prop.id) &&
  contentModeNonCopyablePropTypes.has(prop.type) === false;

export const getContentModeCapabilities = ({
  instances,
  metas,
  props,
  styleSources,
  styleSourceSelections = new Map(),
  styles = new Map(),
  breakpoints,
  contentRootIds: providedContentRootIds,
}: {
  instances: Map<Instance["id"], Instance>;
  metas: Map<Instance["component"], WsComponentMeta>;
  props: Props;
  styleSources: StyleSources;
  styleSourceSelections?: StyleSourceSelections;
  styles?: Styles;
  breakpoints?: Breakpoints;
  contentRootIds?: Set<Instance["id"]>;
}): ContentModeCapabilities => {
  const editablePropIds = new Set<Prop["id"]>();
  const contentRootIds = new Set<Instance["id"]>();
  for (const instanceId of providedContentRootIds ??
    getDefaultContentRootIds(instances)) {
    if (instances.has(instanceId)) {
      contentRootIds.add(instanceId);
    }
  }
  const editableInstanceIds = getContentModeEditableInstanceIds({
    contentRootIds,
    instances,
  });
  const frontmatterTargets = getContentModeFrontmatterBoundTargets({
    instances,
    props,
  });
  const capabilities = {
    editablePropIds,
    editableInstanceIds,
    instances,
    metas,
    props,
    htmlTagsByInstanceId: getHtmlTagsFromProps(props),
    styleSources,
    styleSourceSelections,
    styles,
    breakpoints,
    contentRootIds,
    frontmatterBoundPropIds: frontmatterTargets.propIds,
    frontmatterBoundTextInstanceIds: frontmatterTargets.textInstanceIds,
  };
  for (const prop of props.values()) {
    const instance = instances.get(prop.instanceId);
    if (instance === undefined) {
      continue;
    }
    if (editableInstanceIds.has(instance.id) === false) {
      continue;
    }
    if (
      getContentModePropEligibility({ capabilities, instance, prop }).editable
    ) {
      editablePropIds.add(prop.id);
    }
  }

  return capabilities;
};
