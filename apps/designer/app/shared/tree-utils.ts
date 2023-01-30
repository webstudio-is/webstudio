import type { Instance, Props, Styles } from "@webstudio-is/project-build";
import { removeByMutable } from "./array-utils";

const traverseInstances = (
  instance: Instance,
  cb: (child: Instance, parent: Instance) => void
) => {
  for (const child of instance.children) {
    if (child.type === "text") {
      continue;
    }
    if (child.type === "instance") {
      cb(child, instance);
      traverseInstances(child, cb);
    }
  }
};

export const deleteInstanceMutable = ({
  rootInstance,
  props,
  styles,
  deletedInstanceId,
}: {
  rootInstance: Instance;
  props: Props;
  styles: Styles;
  deletedInstanceId: string;
}) => {
  const parentInstances = new Map<Instance["id"], Instance>();
  const deletedInstances = new Set<Instance["id"]>();

  traverseInstances(rootInstance, (child, instance) => {
    parentInstances.set(child.id, instance);
    // mark as deleted the instance
    if (child.id === deletedInstanceId) {
      deletedInstances.add(child.id);
    }
    // and all descendants of deleted instance
    if (deletedInstances.has(instance.id)) {
      deletedInstances.add(child.id);
    }
  });

  const parentInstance = parentInstances.get(deletedInstanceId);
  if (parentInstance === undefined) {
    return;
  }

  removeByMutable(
    parentInstance.children,
    (child) => child.type === "instance" && child.id === deletedInstanceId
  );
  // delete props and styles of deleted instance and its descendants
  removeByMutable(props, (prop) => deletedInstances.has(prop.instanceId));
  removeByMutable(styles, (styleDecl) =>
    deletedInstances.has(styleDecl.instanceId)
  );

  return parentInstance;
};
