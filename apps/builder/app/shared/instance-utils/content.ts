import type { Instance, Instances } from "@webstudio-is/sdk";

export type ContentPart =
  | {
      type: "text";
      childIndex: number;
      value: string;
    }
  | {
      type: "expression";
      childIndex: number;
      value: string;
    }
  | {
      type: "instance";
      childIndex: number;
      instanceId: Instance["id"];
      component?: Instance["component"];
      label?: Instance["label"];
    };

export type ContentEditorMode =
  | {
      type: "simple";
      instanceId: Instance["id"];
    }
  | {
      type: "parts";
      instanceId: Instance["id"];
      parts: ContentPart[];
    }
  | { type: "instances-only" }
  | { type: "unsupported" };

export const classifyInstanceContent = ({
  instance,
  instances,
  supported,
}: {
  instance: Instance;
  instances: Instances;
  supported: boolean;
}): ContentEditorMode => {
  if (supported === false) {
    return { type: "unsupported" };
  }

  if (instance.children.length === 0) {
    return { type: "simple", instanceId: instance.id };
  }

  if (instance.children.length === 1 && instance.children[0]?.type !== "id") {
    return { type: "simple", instanceId: instance.id };
  }

  if (instance.children.every((child) => child.type === "id")) {
    return { type: "instances-only" };
  }

  const parts: ContentPart[] = instance.children.map((child, childIndex) => {
    if (child.type !== "id") {
      return { ...child, childIndex };
    }
    const childInstance = instances.get(child.value);
    return {
      type: "instance",
      childIndex,
      instanceId: child.value,
      component: childInstance?.component,
      label: childInstance?.label,
    };
  });

  return { type: "parts", instanceId: instance.id, parts };
};

export const isSimpleTextContent = ({
  instance,
  instances,
}: {
  instance: Instance;
  instances: Instances;
}) =>
  classifyInstanceContent({ instance, instances, supported: true }).type ===
  "simple";
