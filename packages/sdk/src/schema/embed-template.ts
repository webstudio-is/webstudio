import { z } from "zod";
import type { Simplify } from "type-fest";
import { StyleValue, type StyleProperty } from "@webstudio-is/css-engine";

const EmbedTemplateText = z.object({
  type: z.literal("text"),
  value: z.string(),
  placeholder: z.boolean().optional(),
});

type EmbedTemplateText = z.infer<typeof EmbedTemplateText>;

const EmbedTemplateExpression = z.object({
  type: z.literal("expression"),
  value: z.string(),
});

type EmbedTemplateExpression = z.infer<typeof EmbedTemplateExpression>;

export const EmbedTemplateVariable = z.object({
  alias: z.optional(z.string()),
  initialValue: z.unknown(),
});

export type EmbedTemplateVariable = z.infer<typeof EmbedTemplateVariable>;

export const EmbedTemplateProp = z.union([
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
  z.object({
    type: z.literal("json"),
    name: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("expression"),
    name: z.string(),
    code: z.string(),
  }),
  z.object({
    type: z.literal("parameter"),
    name: z.string(),
    variableName: z.string(),
    variableAlias: z.optional(z.string()),
  }),
  z.object({
    type: z.literal("action"),
    name: z.string(),
    value: z.array(
      z.object({
        type: z.literal("execute"),
        args: z.optional(z.array(z.string())),
        code: z.string(),
      })
    ),
  }),
]);

export type EmbedTemplateProp = z.infer<typeof EmbedTemplateProp>;

const EmbedTemplateStyleDeclRaw = z.object({
  // State selector, e.g. :hover
  state: z.optional(z.string()),
  property: z.string(),
  value: StyleValue,
});

export type EmbedTemplateStyleDecl = Simplify<
  Omit<z.infer<typeof EmbedTemplateStyleDeclRaw>, "property"> & {
    property: StyleProperty;
  }
>;

export const EmbedTemplateStyleDecl =
  EmbedTemplateStyleDeclRaw as z.ZodType<EmbedTemplateStyleDecl>;

export type EmbedTemplateInstance = {
  type: "instance";
  component: string;
  label?: string;
  variables?: Record<string, EmbedTemplateVariable>;
  props?: EmbedTemplateProp[];
  styles?: EmbedTemplateStyleDecl[];
  children: Array<
    EmbedTemplateInstance | EmbedTemplateText | EmbedTemplateExpression
  >;
};

export const EmbedTemplateInstance: z.ZodType<EmbedTemplateInstance> = z.lazy(
  () =>
    z.object({
      type: z.literal("instance"),
      component: z.string(),
      label: z.optional(z.string()),
      variables: z.optional(z.record(z.string(), EmbedTemplateVariable)),
      props: z.optional(z.array(EmbedTemplateProp)),
      styles: z.optional(z.array(EmbedTemplateStyleDecl)),
      children: WsEmbedTemplate,
    })
);

export const WsEmbedTemplate = z.lazy(() =>
  z.array(
    z.union([EmbedTemplateInstance, EmbedTemplateText, EmbedTemplateExpression])
  )
);

export type WsEmbedTemplate = z.infer<typeof WsEmbedTemplate>;
