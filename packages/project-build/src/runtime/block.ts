import {
  blockComponent,
  blockTemplateComponent,
  type Instance,
  type Instances,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "./tree";

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
