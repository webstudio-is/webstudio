import { z } from "zod";
import type { FunctionComponent } from "react";
import type { IconProps } from "@webstudio-is/icons";
import type { Style } from "@webstudio-is/css-data";

export type MetaProps = Partial<z.infer<typeof Props>>;

export type WsComponentMeta = {
  /**
   * body - can accept other components with dnd but not listed
   * container - can accept other components with dnd
   * control - usually form controls like inputs, without children
   * embed - images, videos or other embeddable components, without children
   * rich-text - editable text component
   * rich-text-child - formatted text fragment, not listed in components list
   */
  type:
    | "body"
    | "container"
    | "control"
    | "embed"
    | "rich-text"
    | "rich-text-child";
  label: string;
  Icon: FunctionComponent<IconProps>;
  presetStyle?: Style;
  children?: Array<string>;
  props: MetaProps;
  initialProps?: Array<string>;
};

const Props = z.record(
  z.union([
    z.object({
      type: z.literal("number"),
      required: z.boolean(),
      defaultValue: z.number().nullable(),
    }),

    z.object({
      type: z.literal("text"),
      required: z.boolean(),
      defaultValue: z.string().nullable(),
    }),

    z.object({
      type: z.literal("color"),
      required: z.boolean(),
      defaultValue: z.string().nullable(),
    }),

    z.object({
      type: z.literal("boolean"),
      required: z.boolean(),
      defaultValue: z.boolean().nullable(),
    }),

    z.object({
      type: z.enum([
        "radio",
        "inline-radio",
        "check",
        "inline-check",
        "multi-select",
        "select",
      ]),
      required: z.boolean(),
      options: z.array(z.string()),
      defaultValue: z.string().nullable(),
    }),
  ])
);

export const WsComponentMeta = z.lazy(() =>
  z.object({
    type: z.enum([
      "body",
      "container",
      "control",
      "embed",
      "rich-text",
      "rich-text-child",
    ]),
    label: z.string(),
    Icon: z.any(),
    presetStyle: z.optional(z.any()),
    children: z.optional(z.array(z.string())),
    props: Props,
    initialProps: z.optional(z.array(z.string())),
  })
);
