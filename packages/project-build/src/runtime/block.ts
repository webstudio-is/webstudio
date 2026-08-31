import {
  allocateUniqueContentBlockTemplateName,
  blockComponent,
  blockTemplateComponent,
  findContentBlockBodyContainerPaths,
  findParentInstanceReference,
  findContentBlockTemplateContainers,
  getContentBlockSource,
  getInstanceName,
  type ContentBlockSource,
  type Instance,
  type Instances,
  type Prop,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { computeStringExpression } from "./data";
import type { InstanceSelector } from "./tree";

export const resolveContentBlockSourceAssetId = ({
  source,
  values,
}: {
  source: ContentBlockSource;
  values?: ReadonlyMap<string, unknown>;
}) =>
  source.type === "asset"
    ? source.assetId
    : values === undefined
      ? undefined
      : computeStringExpression(source.value, values);

export const assignUniqueBlockTemplateNamesMutable = ({
  instanceIds,
  parent,
  replacedInstanceIds = [],
  instances,
}: {
  instanceIds: readonly Instance["id"][];
  parent: Instance;
  replacedInstanceIds?: readonly Instance["id"][];
  instances: Instances;
}) => {
  if (parent.component !== blockTemplateComponent) {
    return;
  }
  const ignoredIds = new Set([...instanceIds, ...replacedInstanceIds]);
  const existingNames = new Set<string>();
  for (const child of parent.children) {
    const instance =
      child.type === "id" ? instances.get(child.value) : undefined;
    if (instance !== undefined && ignoredIds.has(instance.id) === false) {
      existingNames.add(getInstanceName({ instance, metas: componentMetas }));
    }
  }

  for (const instanceId of instanceIds) {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    const currentName = getInstanceName({ instance, metas: componentMetas });
    const uniqueName = allocateUniqueContentBlockTemplateName({
      name: currentName,
      existingNames,
    });
    if (uniqueName !== currentName) {
      instance.label = uniqueName;
    }
    existingNames.add(uniqueName);
  }
};

export const findBlockTemplateNameCollision = ({
  instance,
  nextInstance,
  instances,
}: {
  instance: Instance;
  nextInstance: Instance;
  instances: Instances;
}) => {
  const name = getInstanceName({
    instance: nextInstance,
    metas: componentMetas,
  });
  if (name === getInstanceName({ instance, metas: componentMetas })) {
    return;
  }
  const parent = findParentInstanceReference(instances, instance.id)?.instance;
  if (parent?.component !== blockTemplateComponent) {
    return;
  }
  for (const child of parent.children) {
    if (child.type !== "id" || child.value === instance.id) {
      continue;
    }
    const sibling = instances.get(child.value);
    if (
      sibling !== undefined &&
      getInstanceName({ instance: sibling, metas: componentMetas }) === name
    ) {
      return { instance: sibling, name };
    }
  }
};

export type BlockTemplateNameConfirmation = {
  action: "rename" | "delete";
  templates: Array<{
    instanceId: Instance["id"];
    oldName: string;
    newName?: string;
  }>;
};

export const getSourceBackedBlockTemplateContext = ({
  templateInstanceId,
  instances,
  props,
}: {
  templateInstanceId: Instance["id"];
  instances: Instances;
  props: Iterable<Prop>;
}) => {
  const template = instances.get(templateInstanceId);
  const templates = findParentInstanceReference(
    instances,
    templateInstanceId
  )?.instance;
  if (
    template === undefined ||
    templates?.component !== blockTemplateComponent
  ) {
    return;
  }
  const block = findParentInstanceReference(instances, templates.id)?.instance;
  if (block?.component !== blockComponent) {
    return;
  }
  const source = getContentBlockSource({
    blockInstanceId: block.id,
    props,
  });
  if (source === undefined) {
    return;
  }
  return {
    blockInstanceId: block.id,
    templatesInstanceId: templates.id,
    templateInstanceId,
    templateName: getInstanceName({
      instance: template,
      metas: componentMetas,
    }),
    source,
  };
};

export const getBlockTemplateNameConfirmation = ({
  changes,
  instances,
  props,
}: {
  changes: ReadonlyArray<{
    instance: Instance;
    nextInstance?: Instance;
  }>;
  instances: Instances;
  props: Iterable<Prop>;
}): BlockTemplateNameConfirmation | undefined => {
  const templates: BlockTemplateNameConfirmation["templates"] = [];
  const sourceProps = Array.from(props);
  for (const { instance, nextInstance } of changes) {
    const context = getSourceBackedBlockTemplateContext({
      templateInstanceId: instance.id,
      instances,
      props: sourceProps,
    });
    if (context === undefined) {
      continue;
    }
    const oldName = context.templateName;
    const newName =
      nextInstance === undefined
        ? undefined
        : getInstanceName({ instance: nextInstance, metas: componentMetas });
    if (newName === oldName) {
      continue;
    }
    templates.push({
      instanceId: instance.id,
      oldName,
      ...(newName === undefined ? {} : { newName }),
    });
  }
  if (templates.length === 0) {
    return;
  }
  return {
    action: changes.some(({ nextInstance }) => nextInstance === undefined)
      ? "delete"
      : "rename",
    templates,
  };
};

export const findBlockChildSelector = ({
  instanceSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  const contentSelector = findBlockContentSelector({
    anchor: instanceSelector,
    instances,
  });
  if (contentSelector === undefined) {
    return;
  }
  const contentIndex = instanceSelector.length - contentSelector.length;
  if (contentIndex === 0) {
    return contentSelector;
  }
  return instanceSelector.slice(contentIndex - 1);
};

export const findBlockSelector = ({
  anchor,
  instances,
}: {
  anchor: InstanceSelector;
  instances: Instances;
}) => {
  if (anchor.length === 0) {
    return;
  }

  for (let index = 0; index < anchor.length; index += 1) {
    const instanceId = anchor[index];
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    if (instance.component === blockComponent) {
      return anchor.slice(index);
    }
  }
};

/** Finds the container whose children are editable Content Block content. */
export const findBlockContentSelector = ({
  anchor,
  instances,
}: {
  anchor: InstanceSelector;
  instances: Instances;
}) => {
  const blockSelector = findBlockSelector({ anchor, instances });
  if (blockSelector === undefined) {
    return;
  }
  const block = instances.get(blockSelector[0]);
  if (block === undefined) {
    return;
  }
  const bodyPaths = findContentBlockBodyContainerPaths({
    blockInstance: block,
    instances,
  });
  if (bodyPaths.length === 0) {
    return blockSelector;
  }
  if (bodyPaths.length > 1) {
    return;
  }
  const bodyPath = bodyPaths[0];
  const body = bodyPath.at(-1)!;
  const bodyIndex = anchor.indexOf(body.id);
  if (bodyIndex !== -1) {
    return anchor.slice(bodyIndex);
  }
  if (anchor[0] === block.id) {
    return [...bodyPath.map(({ id }) => id).reverse(), ...blockSelector];
  }
};

export const canMoveInstanceInContentMode = ({
  instanceSelector,
  parentSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  parentSelector: InstanceSelector;
  instances: Instances;
}) => {
  const sourceContent = findBlockContentSelector({
    anchor: instanceSelector,
    instances,
  });
  const targetContent = findBlockContentSelector({
    anchor: parentSelector,
    instances,
  });
  return (
    sourceContent !== undefined &&
    targetContent !== undefined &&
    sourceContent[0] === targetContent[0] &&
    instanceSelector.length > sourceContent.length &&
    instanceSelector
      .slice(0, instanceSelector.length - sourceContent.length)
      .every(
        (instanceId) =>
          instances.get(instanceId)?.component !== blockTemplateComponent
      ) &&
    parentSelector
      .slice(0, parentSelector.length - targetContent.length)
      .every(
        (instanceId) =>
          instances.get(instanceId)?.component !== blockTemplateComponent
      )
  );
};

export const canDeleteInstanceInContentMode = ({
  instanceSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  const contentSelector = findBlockContentSelector({
    anchor: instanceSelector,
    instances,
  });
  if (contentSelector === undefined) {
    return false;
  }

  if (instanceSelector.length - contentSelector.length !== 1) {
    return false;
  }
  return (
    instances.get(instanceSelector[0])?.component !== blockTemplateComponent
  );
};

export const findBlockTemplates = ({
  anchor,
  instances,
}: {
  anchor: InstanceSelector;
  instances: Instances;
}) => {
  const blockInstanceSelector = findBlockSelector({ anchor, instances });
  if (blockInstanceSelector === undefined) {
    return;
  }

  const blockInstance = instances.get(blockInstanceSelector[0]);
  if (blockInstance === undefined) {
    return;
  }

  const templateInstance = findContentBlockTemplateContainers({
    blockInstance,
    instances,
  })[0];
  if (templateInstance === undefined) {
    return;
  }

  return templateInstance.children
    .filter((child) => child.type === "id")
    .map((child) => child.value)
    .map((childId) => instances.get(childId))
    .filter((child): child is Instance => child !== undefined)
    .map(
      (child) =>
        [child, [child.id, templateInstance.id, ...blockInstanceSelector]] as [
          Instance,
          InstanceSelector,
        ]
    );
};

export const getBlockTemplateInsertionIndex = ({
  anchor,
  instances,
  insertBefore = false,
}: {
  anchor: InstanceSelector;
  instances: Instances;
  insertBefore?: boolean;
}) => {
  const blockSelector = findBlockSelector({ anchor, instances });
  if (blockSelector === undefined) {
    return;
  }

  const blockInstance = instances.get(blockSelector[0]);
  if (blockInstance === undefined) {
    return;
  }

  const contentSelector = findBlockContentSelector({ anchor, instances });
  if (contentSelector === undefined) {
    return;
  }
  const contentInstance = instances.get(contentSelector[0]);
  if (contentInstance === undefined) {
    return;
  }

  const insertAtInitialPosition =
    anchor[0] === blockInstance.id || anchor[0] === contentInstance.id;

  const childBlockSelector = findBlockChildSelector({
    instanceSelector: anchor,
    instances,
  });
  if (childBlockSelector === undefined) {
    return;
  }

  const templateContainerId =
    contentInstance === blockInstance
      ? findContentBlockTemplateContainers({
          blockInstance,
          instances,
        })[0]?.id
      : undefined;
  const index = contentInstance.children.findIndex((child) => {
    if (child.type !== "id") {
      return false;
    }
    if (insertAtInitialPosition) {
      return child.value === templateContainerId;
    }
    return child.value === childBlockSelector[0];
  });
  if (index === -1) {
    return insertAtInitialPosition && templateContainerId === undefined
      ? 0
      : undefined;
  }

  if (insertAtInitialPosition) {
    return index + 1;
  }
  return insertBefore ? index : index + 1;
};
