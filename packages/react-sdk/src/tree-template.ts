import { z } from "zod";
import { nanoid } from "nanoid";
import type { Instance, InstancesList } from "@webstudio-is/project-build";

export const TreeTemplateText = z.object({
  type: z.literal("text"),
  value: z.string(),
});

export type TreeTemplateText = z.infer<typeof TreeTemplateText>;

export type TreeTemplateInstance = {
  type: "instance";
  component: string;
  children: Array<TreeTemplateInstance | TreeTemplateText>;
};

export const TreeTemplateInstance: z.ZodType<TreeTemplateInstance> = z.object({
  type: z.literal("instance"),
  component: z.string(),
  children: z.lazy(() => TreeTemplate),
});

export const TreeTemplate = z.array(
  z.union([z.lazy(() => TreeTemplateInstance), TreeTemplateText])
);

export type TreeTemplate = z.infer<typeof TreeTemplate>;

const createInstancesFromTemplate = (
  treeTemplate: TreeTemplate,
  instances: InstancesList
) => {
  const parentChildren: Instance["children"] = [];
  for (const item of treeTemplate) {
    if (item.type === "instance") {
      const instanceId = nanoid();
      const instance: Instance = {
        type: "instance",
        id: instanceId,
        component: item.component,
        children: [],
      };
      instances.push(instance);
      // traverse children after to preserve top down order
      instance.children = createInstancesFromTemplate(item.children, instances);
      parentChildren.push({
        type: "id",
        value: instanceId,
      });
    }
    if (item.type === "text") {
      parentChildren.push({
        type: "text",
        value: item.value,
      });
    }
  }
  return parentChildren;
};

export const generateTreeFromTemplate = (treeTemplate: TreeTemplate) => {
  const instances: InstancesList = [];
  const children = createInstancesFromTemplate(treeTemplate, instances);
  return { children, instances };
};
