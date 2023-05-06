import { z } from "zod";
import type { FunctionComponent } from "react";
import type { IconProps } from "@webstudio-is/icons";
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

export const ComponentState = z.object({
  selector: z.string(),
  label: z.string(),
});

export type ComponentState = z.infer<typeof ComponentState>;

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
  acceptedParents: z.optional(z.array(z.string())),
  label: z.string(),
  Icon: z.function(),
  presetStyle: z.optional(z.any()),
  states: z.optional(z.array(ComponentState)),
  children: z.optional(WsEmbedTemplate),
});

export type WsComponentMeta = Omit<
  z.infer<typeof WsComponentMeta>,
  "presetStyle" | "Icon"
> & {
  presetStyle?: PresetStyle;
  Icon: FunctionComponent<IconProps>;
};
