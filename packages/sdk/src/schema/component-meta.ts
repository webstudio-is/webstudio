import { z } from "zod";
import type { HtmlTags } from "html-tags";
import { PropMeta } from "./prop-meta";
import { Matchers } from "./instances";
import { StyleValue, type CssProperty } from "@webstudio-is/css-engine";
import type { Simplify } from "type-fest";

export const PresetStyleDecl = z.object({
  // State selector, e.g. :hover
  state: z.optional(z.string()),
  property: z.string(),
  value: StyleValue,
});

export type PresetStyleDecl = Simplify<
  Omit<z.infer<typeof PresetStyleDecl>, "property"> & {
    property: CssProperty;
  }
>;

export type PresetStyle<Tag extends HtmlTags = HtmlTags> = Partial<
  Record<Tag, PresetStyleDecl[]>
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
  "typography",
  "media",
  "animations",
  "data",
  "forms",
  "localization",
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

export const defaultStates: ComponentState[] = [
  { selector: ":hover", label: "Hover" },
  { selector: ":active", label: "Active" },
  { selector: ":focus", label: "Focus" },
  { selector: ":focus-visible", label: "Focus Visible" },
  { selector: ":focus-within", label: "Focus Within" },
];

export const ContentModel = z.object({
  /*
   * instance - accepted by any parent with "instance" in children categories
   * none - accepted by parents with this component name in children categories
   */
  category: z.union([z.literal("instance"), z.literal("none")]),
  /**
   * transparent - pass through possible children from parent
   * rich-text - can be edited as rich text
   * instance - other instances accepted
   * empty - no children accepted
   * ComponentName - accept specific components with none category
   */
  children: z.array(
    z.string() as z.ZodType<
      "transparent" | "instance" | "rich-text" | "empty" | (string & {})
    >
  ),
});

export type ContentModel = z.infer<typeof ContentModel>;

export const WsComponentMeta = z.object({
  category: z.enum(componentCategories).optional(),
  // container - can accept other components with dnd or be edited as text
  // control - usually form controls like inputs, without children
  // embed - images, videos or other embeddable components, without children
  type: z.enum(["container", "control", "embed"]),
  /**
   * a property used as textual placeholder when no content specified while in builder
   * also signals to not insert components inside unless dropped explicitly
   */
  placeholder: z.string().optional(),
  constraints: Matchers.optional(),
  contentModel: ContentModel.optional(),
  // when this field is specified component receives
  // prop with index of same components withiin specified ancestor
  // important to automatically enumerate collections without
  // naming every item manually
  indexWithinAncestor: z.optional(z.string()),
  label: z.optional(z.string()),
  description: z.string().optional(),
  icon: z.string(),
  presetStyle: z.optional(z.record(z.string(), z.array(PresetStyleDecl))),
  states: z.optional(z.array(ComponentState)),
  order: z.number().optional(),
});

export type WsComponentMeta = Omit<
  z.infer<typeof WsComponentMeta>,
  "presetStyle"
> & {
  presetStyle?: PresetStyle;
};
