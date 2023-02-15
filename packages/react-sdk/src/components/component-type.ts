import { z } from "zod";
import type { FunctionComponent } from "react";
import type { IconProps } from "@webstudio-is/icons";
import type { Style } from "@webstudio-is/css-data";
import { PropMeta } from "@webstudio-is/generate-arg-types";

export const MetaProps = z.record(PropMeta);

export type MetaProps = Partial<z.infer<typeof MetaProps>>;

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
    props: MetaProps,
    initialProps: z.optional(z.array(z.string())),
  })
);
