import { z } from "zod";
import type { HtmlTags } from "html-tags";
import type { Simplify } from "type-fest";
import { styleValue, type CssProperty } from "@webstudio-is/css-engine";
import { propMeta } from "./prop-meta";

export const presetStyleDecl = z.object({
  // State selector, e.g. :hover
  state: z.optional(z.string()),
  property: z.string(),
  value: styleValue,
});

export type PresetStyleDecl = Simplify<
  Omit<z.infer<typeof presetStyleDecl>, "property"> & {
    property: CssProperty;
  }
>;

export type PresetStyle<Tag extends HtmlTags = HtmlTags> = Partial<
  Record<Tag, PresetStyleDecl[]>
>;

export const componentCategories = [
  "general",
  "typography",
  "media",
  "animations",
  "data",
  "forms",
  "localization",
  "radix",
  "xml",
  "text",
  "other",
  "hidden",
  "internal",
] as const;

export const componentState = z.object({
  selector: z.string(),
  label: z.string(),
});

export type ComponentState = z.infer<typeof componentState>;

/**
 * rich-text - can be edited as rich text
 * instance - other instances accepted
 * ComponentName - accept specific components with none category
 */
const componentContent = z.string() as z.ZodType<
  "instance" | "rich-text" | (string & {})
>;

export const contentModel = z.object({
  /*
   * instance - accepted by any parent with "instance" in children categories
   * none - accepted by parents with this component name in children categories
   */
  category: z.union([z.literal("instance"), z.literal("none")]),
  /**
   * enforce direct children of category or components
   */
  children: z.array(componentContent),
  /**
   * enforce descendants of category or components
   */
  descendants: z.array(componentContent).optional(),
});

export type ContentModel = z.infer<typeof contentModel>;

export const wsComponentMeta = z.object({
  category: z.enum(componentCategories).optional(),
  contentModel: contentModel.optional(),
  // when this field is specified component receives
  // prop with index of same components withiin specified ancestor
  // important to automatically enumerate collections without
  // naming every item manually
  indexWithinAncestor: z.optional(z.string()),
  label: z.optional(z.string()),
  description: z.string().optional(),
  icon: z.string().optional(),
  presetStyle: z.optional(z.record(z.string(), z.array(presetStyleDecl))),
  states: z.optional(z.array(componentState)),
  order: z.number().optional(),
  // properties and html attributes that will be always visible in properties panel
  initialProps: z.array(z.string()).optional(),
  props: z.record(propMeta).optional(),
});

export type WsComponentMeta = Omit<
  z.infer<typeof wsComponentMeta>,
  "presetStyle"
> & {
  presetStyle?: PresetStyle;
};
