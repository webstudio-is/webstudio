import { z } from "zod";
import { nanoid } from "nanoid";
import {
  type Instance,
  type InstancesList,
  PropsList,
} from "@webstudio-is/project-build";

const EmbedTemplateText = z.object({
  type: z.literal("text"),
  value: z.string(),
});

type EmbedTemplateText = z.infer<typeof EmbedTemplateText>;

const EmbedTemplateProp = z.union([
  z.object({
    type: z.literal("number"),
    name: z.string(),
    value: z.number(),
  }),
  z.object({
    type: z.literal("string"),
    name: z.string(),
    value: z.string(),
  }),
  z.object({
    type: z.literal("boolean"),
    name: z.string(),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("string[]"),
    name: z.string(),
    value: z.array(z.string()),
  }),
]);

type EmbedTemplateProp = z.infer<typeof EmbedTemplateProp>;

type EmbedTemplateInstance = {
  type: "instance";
  component: string;
  props?: EmbedTemplateProp[];
  children: Array<EmbedTemplateInstance | EmbedTemplateText>;
};

const EmbedTemplateInstance: z.ZodType<EmbedTemplateInstance> = z.object({
  type: z.literal("instance"),
  component: z.string(),
  props: z.optional(z.array(EmbedTemplateProp)),
  children: z.lazy(() => WsEmbedTemplate),
});

export const WsEmbedTemplate = z.array(
  z.union([z.lazy(() => EmbedTemplateInstance), EmbedTemplateText])
);

export type WsEmbedTemplate = z.infer<typeof WsEmbedTemplate>;

const createInstancesFromTemplate = (
  treeTemplate: WsEmbedTemplate,
  instances: InstancesList,
  props: PropsList
) => {
  const parentChildren: Instance["children"] = [];
  for (const item of treeTemplate) {
    if (item.type === "instance") {
      const instanceId = nanoid();

      // populate props
      if (item.props) {
        for (const prop of item.props) {
          props.push({
            id: nanoid(),
            instanceId,
            ...prop,
          });
        }
      }

      // populate instances
      const instance: Instance = {
        type: "instance",
        id: instanceId,
        component: item.component,
        children: [],
      };
      instances.push(instance);
      // traverse children after to preserve top down order
      instance.children = createInstancesFromTemplate(
        item.children,
        instances,
        props
      );
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
  const props: PropsList = [];
  const children = createInstancesFromTemplate(treeTemplate, instances, props);
  return { children, instances, props };
};
