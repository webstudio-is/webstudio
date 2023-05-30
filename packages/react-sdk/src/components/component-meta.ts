import { z } from "zod";
import { PropMeta } from "@webstudio-is/generate-arg-types";
import type { htmlTags as HtmlTags } from "html-tags";
import { EmbedTemplateStyleDecl, WsEmbedTemplate } from "../embed-template";

export type PresetStyle<Tag extends HtmlTags = HtmlTags> = Partial<
  Record<Tag, EmbedTemplateStyleDecl[]>
>;

// props are separated from the rest of the meta
// so they can be exported separately and potentially tree-shaken
const WsComponentPropsMeta = z.object({
  props: z.record(PropMeta),
  initialProps: z.array(z.string()).optional(),
});

export type WsComponentPropsMeta = z.infer<typeof WsComponentPropsMeta>;

export const componentCategories = [
  "general",
  "typography",
  "media",
  "forms",
] as const;

export const stateCategories = ["states", "component-states"] as const;

export const ComponentState = z.object({
  category: z.enum(stateCategories).optional(),
  selector: z.string(),
  label: z.string(),
});

export type ComponentState = z.infer<typeof ComponentState>;

export const defaultStates: ComponentState[] = [
  { selector: ":hover", label: "Hover" },
  { selector: ":active", label: "Active" },
  { selector: ":focus", label: "Focus" },
  { selector: ":focus-visible", label: "Focus Visible" },
  { selector: ":focus-within", label: "Focus Within" },
];

const WsComponentMeta = z.object({
  category: z.enum(componentCategories).optional(),
  // container - can accept other components with dnd
  // control - usually form controls like inputs, without children
  // embed - images, videos or other embeddable components, without children
  // rich-text - editable text component
  // rich-text-child - formatted text fragment, not listed in components list
  type: z.enum([
    "container",
    "control",
    "embed",
    "rich-text",
    "rich-text-child",
  ]),
  requiredAncestors: z.optional(z.array(z.string())),
  invalidAncestors: z.optional(z.array(z.string())),
  label: z.string(),
  icon: z.string(),
  presetStyle: z.optional(z.record(z.string(), EmbedTemplateStyleDecl)),
  states: z.optional(z.array(ComponentState)),
  template: z.optional(WsEmbedTemplate),
});

export type WsComponentMeta = Omit<
  z.infer<typeof WsComponentMeta>,
  "presetStyle"
> & {
  presetStyle?: PresetStyle;
};
