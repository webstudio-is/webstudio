import { z } from "zod";
import { nanoid } from "nanoid";
import type { Instance, InstancesList } from "@webstudio-is/project-build";

const EmbedTemplateText = z.object({
  type: z.literal("text"),
  value: z.string(),
});

type EmbedTemplateText = z.infer<typeof EmbedTemplateText>;

type EmbedTemplateInstance = {
  type: "instance";
  component: string;
  children: Array<EmbedTemplateInstance | EmbedTemplateText>;
};

const EmbedTemplateInstancen: z.ZodType<EmbedTemplateInstance> = z.object({
  type: z.literal("instance"),
  component: z.string(),
  children: z.lazy(() => WsEmbedTemplate),
});

export const WsEmbedTemplate = z.array(
  z.union([z.lazy(() => EmbedTemplateInstancen), EmbedTemplateText])
);

export type WsEmbedTemplate = z.infer<typeof WsEmbedTemplate>;

const createInstancesFromTemplate = (
  treeTemplate: WsEmbedTemplate,
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

export const generateDataFromEmbedTemplate = (
  treeTemplate: WsEmbedTemplate
) => {
  const instances: InstancesList = [];
  const children = createInstancesFromTemplate(treeTemplate, instances);
  return { children, instances };
};
