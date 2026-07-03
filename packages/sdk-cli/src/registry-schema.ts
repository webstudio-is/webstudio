import { registryItemSchema, registrySchema } from "shadcn/schema";
import {
  componentCategories,
  componentState,
  contentModel,
  presetStyleDecl,
  propMeta,
} from "@webstudio-is/sdk";
import { templateCategories } from "@webstudio-is/template";
import { z } from "zod";

const eraseSchemaType = (schema: unknown) => schema as z.ZodTypeAny;
const registryContentModel = eraseSchemaType(contentModel);
const registryPropMeta = eraseSchemaType(propMeta);
const registryComponentState = eraseSchemaType(componentState);
const registryPresetStyleDecl = eraseSchemaType(presetStyleDecl);

export const webstudioRegistrySourceSchema = z.object({
  package: z.string().min(1),
  export: z.string().min(1),
  kind: z.enum(["component", "template"]),
});

export const webstudioRegistryCompositionSchema = z.object({
  family: z.string().min(1),
  role: z.enum(["root", "part"]),
  tree: z.string().min(1).optional(),
});

export const webstudioRegistryTemplateSchema = z
  .object({
    name: z.string().min(1),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    category: z.enum(templateCategories),
  })
  .passthrough();

export const webstudioRegistryMetaSchema = z
  .object({
    docs: z.string().regex(/^docs\/.+\.mdx$/),
    source: webstudioRegistrySourceSchema,
    component: z.string().min(1).optional(),
    category: z.enum(componentCategories).optional(),
    contentModel: registryContentModel.optional(),
    indexWithinAncestor: z.string().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    presetStyle: z
      .record(z.string(), z.array(registryPresetStyleDecl))
      .optional(),
    order: z.number().optional(),
    initialProps: z.array(z.string()).optional(),
    props: z.record(registryPropMeta).optional(),
    states: z.array(registryComponentState).optional(),
    composition: webstudioRegistryCompositionSchema.optional(),
    template: webstudioRegistryTemplateSchema.optional(),
  })
  .passthrough()
  .superRefine((meta, context) => {
    if (meta.component === undefined && meta.template === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Registry item meta must define a component or template",
      });
    }
  });

export const webstudioRegistryItemSchema = registryItemSchema.and(
  z.object({
    meta: webstudioRegistryMetaSchema,
  })
);

export const webstudioRegistrySchema = registrySchema.and(
  z.object({
    items: z.array(webstudioRegistryItemSchema),
  })
);

export type WebstudioRegistry = z.infer<typeof webstudioRegistrySchema>;
export type WebstudioRegistryItem = z.infer<typeof webstudioRegistryItemSchema>;
export type WebstudioRegistryMeta = z.infer<typeof webstudioRegistryMetaSchema>;
