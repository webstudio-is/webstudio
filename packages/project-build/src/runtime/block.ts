import {
  blockComponent,
  blockTemplateComponent,
  getInstanceName,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Instances,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import type { InstanceSelector } from "./tree";

const findDirectParent = ({
  childInstanceId,
  component,
  instances,
}: {
  childInstanceId: Instance["id"];
  component: Instance["component"];
  instances: Instances;
}) =>
  Array.from(instances.values()).find(
    (instance) =>
      instance.component === component &&
      instance.children.some(
        (child) => child.type === "id" && child.value === childInstanceId
      )
  );

export const findBlockTemplateOwner = ({
  templateInstanceId,
  instances,
}: {
  templateInstanceId: Instance["id"];
  instances: Instances;
}) => {
  const templateContainer = findDirectParent({
    childInstanceId: templateInstanceId,
    component: blockTemplateComponent,
    instances,
  });
  if (templateContainer === undefined) {
    return;
  }
  const blockInstance = findDirectParent({
    childInstanceId: templateContainer.id,
    component: blockComponent,
    instances,
  });
  if (blockInstance === undefined) {
    return;
  }
  return {
    blockInstanceId: blockInstance.id,
    templateContainerId: templateContainer.id,
  };
};

const getBlockTemplateName = (instance: Instance) =>
  getInstanceName({
    instance,
    componentLabel: componentMetas.get(instance.component)?.label,
  });

export const allocateUniqueBlockTemplateName = ({
  name,
  existingNames,
}: {
  name: string;
  existingNames: ReadonlySet<string>;
}) => {
  const normalizedName = name.trim();
  if (existingNames.has(normalizedName) === false) {
    return normalizedName;
  }

  const suffixMatch = /^(.*) (\d+)$/.exec(normalizedName);
  const suffix = Number(suffixMatch?.[2]);
  const baseName = suffix >= 2 && suffixMatch ? suffixMatch[1] : normalizedName;
  let index = suffix >= 2 ? suffix + 1 : 2;
  let candidate = `${baseName} ${index}`;
  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${baseName} ${index}`;
  }
  return candidate;
};

export const assignUniqueBlockTemplateNamesMutable = ({
  newChildren,
  existingChildren,
  instances,
}: {
  newChildren: Instance["children"];
  existingChildren: Instance["children"];
  instances: Instances;
}) => {
  const existingNames = new Set<string>();
  for (const child of existingChildren) {
    const instance =
      child.type === "id" ? instances.get(child.value) : undefined;
    if (instance !== undefined) {
      existingNames.add(getBlockTemplateName(instance));
    }
  }

  for (const child of newChildren) {
    const instance =
      child.type === "id" ? instances.get(child.value) : undefined;
    if (instance === undefined) {
      continue;
    }
    const currentName = getBlockTemplateName(instance);
    const uniqueName = allocateUniqueBlockTemplateName({
      name: currentName,
      existingNames,
    });
    if (uniqueName !== currentName) {
      instance.label = uniqueName;
    }
    existingNames.add(uniqueName);
  }
};

export const assignUniqueBlockTemplateNameMutable = ({
  instanceId,
  parent,
  replacedInstanceId,
  instances,
}: {
  instanceId: Instance["id"];
  parent: Instance;
  replacedInstanceId?: Instance["id"];
  instances: Instances;
}) => {
  if (parent.component !== blockTemplateComponent) {
    return;
  }
  assignUniqueBlockTemplateNamesMutable({
    newChildren: [{ type: "id", value: instanceId }],
    existingChildren: parent.children.filter(
      (child) => child.type !== "id" || child.value !== replacedInstanceId
    ),
    instances,
  });
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
  const name = getBlockTemplateName(nextInstance);
  if (name === getBlockTemplateName(instance)) {
    return;
  }
  const templateContainer = findDirectParent({
    childInstanceId: instance.id,
    component: blockTemplateComponent,
    instances,
  });
  for (const child of templateContainer?.children ?? []) {
    if (child.type !== "id" || child.value === instance.id) {
      continue;
    }
    const sibling = instances.get(child.value);
    if (sibling !== undefined && getBlockTemplateName(sibling) === name) {
      return { instance: sibling, name };
    }
  }
};

export const getBlockTemplateNameChangeImpact = ({
  templateInstanceId,
  nextLabel,
  externalContent,
  instances,
}: {
  templateInstanceId: Instance["id"];
  nextLabel: string;
  externalContent?: ContentBlockExternalContentIdentity;
  instances: Instances;
}) => {
  const instance = instances.get(templateInstanceId);
  const owner = findBlockTemplateOwner({ templateInstanceId, instances });
  if (instance === undefined || owner === undefined) {
    return;
  }
  const previousName = getBlockTemplateName(instance);
  const nextName = getBlockTemplateName({
    ...instance,
    label: nextLabel.trim(),
  });
  return {
    ...owner,
    previousName,
    nextName,
    externalContent,
    requiresConfirmation:
      externalContent?.blockInstanceId === owner.blockInstanceId &&
      previousName !== nextName,
  };
};

export const findBlockChildSelector = ({
  instanceSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  for (let index = 1; index < instanceSelector.length; index += 1) {
    const instance = instances.get(instanceSelector[index]);
    if (instance?.component === blockComponent) {
      return instanceSelector.slice(index - 1);
    }
  }

  if (instances.get(instanceSelector[0])?.component === blockComponent) {
    return instanceSelector;
  }
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

export const canDeleteInstanceInContentMode = ({
  instanceSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  const blockSelector = findBlockSelector({
    anchor: instanceSelector,
    instances,
  });
  if (blockSelector === undefined) {
    return false;
  }

  if (instanceSelector.length - blockSelector.length !== 1) {
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

  const templateInstanceId = blockInstance.children.find(
    (child) =>
      child.type === "id" &&
      instances.get(child.value)?.component === blockTemplateComponent
  )?.value;
  if (templateInstanceId === undefined) {
    return;
  }

  return instances
    .get(templateInstanceId)
    ?.children.filter((child) => child.type === "id")
    .map((child) => child.value)
    .map((childId) => instances.get(childId))
    .filter((child): child is Instance => child !== undefined)
    .map(
      (child) =>
        [child, [child.id, templateInstanceId, ...blockInstanceSelector]] as [
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

  const insertAtInitialPosition =
    blockSelector.length === anchor.length &&
    blockSelector.every((instanceId, index) => instanceId === anchor[index]);

  const blockInstance = instances.get(blockSelector[0]);
  if (blockInstance === undefined) {
    return;
  }

  const childBlockSelector = findBlockChildSelector({
    instanceSelector: anchor,
    instances,
  });
  if (childBlockSelector === undefined) {
    return;
  }

  const index = blockInstance.children.findIndex((child) => {
    if (child.type !== "id") {
      return false;
    }
    if (insertAtInitialPosition) {
      return instances.get(child.value)?.component === blockTemplateComponent;
    }
    return child.value === childBlockSelector[0];
  });
  if (index === -1) {
    return;
  }

  if (insertAtInitialPosition) {
    return index + 1;
  }
  return insertBefore ? index : index + 1;
};
