import { z } from "zod";
import { PropMeta } from "../prop-meta";
import type { htmlTags as HtmlTags } from "html-tags";
import { EmbedTemplateStyleDecl, WsEmbedTemplate } from "../embed-template";

export type PresetStyle<Tag extends HtmlTags = HtmlTags> = Partial<
  Record<Tag, EmbedTemplateStyleDecl[]>
>;

// props are separated from the rest of the meta
// so they can be exported separately and potentially tree-shaken
const WsComponentPropsMeta = z.object({
  props: z.record(PropMeta),
  // Props that will be always visible in properties panel.
  initialProps: z.array(z.string()).optional(),
});

export type WsComponentPropsMeta = z.infer<typeof WsComponentPropsMeta>;

export const componentCategories = [
  "general",
  "text",
  "data",
  "media",
  "forms",
  "radix",
  "xml",
  "hidden",
  "internal",
] as const;

export const stateCategories = ["states", "component-states"] as const;

export const ComponentState = z.object({
  category: z.enum(stateCategories).optional(),
  selector: z.string(),
  label: z.string(),
});

export type ComponentState = z.infer<typeof ComponentState>;

const ComponentToken = z.object({
  variant: z.optional(z.string()),
  styles: z.array(EmbedTemplateStyleDecl),
});

export const defaultStates: ComponentState[] = [
  { selector: ":hover", label: "Hover" },
  { selector: ":active", label: "Active" },
  { selector: ":focus", label: "Focus" },
  { selector: ":focus-visible", label: "Focus Visible" },
  { selector: ":focus-within", label: "Focus Within" },
];

export const WsComponentMeta = z.object({
  category: z.enum(componentCategories).optional(),
  // container - can accept other components with dnd or be edited as text
  // control - usually form controls like inputs, without children
  // embed - images, videos or other embeddable components, without children
  // rich-text-child - formatted text fragment, not listed in components list
  type: z.enum(["container", "control", "embed", "rich-text-child"]),
  requiredAncestors: z.optional(z.array(z.string())),
  invalidAncestors: z.optional(z.array(z.string())),
  // when this field is specified component receives
  // prop with index of same components withiin specified ancestor
  // important to automatically enumerate collections without
  // naming every item manually
  indexWithinAncestor: z.optional(z.string()),
  stylable: z.optional(z.boolean()),
  // specifies whether the instance can be deleted,
  // copied or dragged out of its parent instance
  // true by default
  detachable: z.optional(z.boolean()),
  label: z.optional(z.string()),
  description: z.string().optional(),
  icon: z.string(),
  presetStyle: z.optional(
    z.record(z.string(), z.array(EmbedTemplateStyleDecl))
  ),
  presetTokens: z.optional(z.record(z.string(), ComponentToken)),
  states: z.optional(z.array(ComponentState)),
  template: z.optional(WsEmbedTemplate),
  order: z.number().optional(),
});

export type WsComponentMeta = Omit<
  z.infer<typeof WsComponentMeta>,
  "presetStyle"
> & {
  presetStyle?: PresetStyle;
};
