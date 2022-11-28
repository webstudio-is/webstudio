import { z } from "zod";
import type { FunctionComponent } from "react";
import { IconProps } from "@webstudio-is/icons";
import type { Style } from "@webstudio-is/css-data";

export type WsComponentMeta<ComponentType> = {
  /**
   * container - can accept other components with dnd
   * control - usually form controls like inputs, without children
   * embed - images, videos or other embeddable components, without children
   * rich-text - editable text component
   * rich-text-child - formatted text fragment, not listed in components list
   */
  type: "container" | "control" | "embed" | "rich-text" | "rich-text-child";
  label: string;
  Component: ComponentType;
  Icon: FunctionComponent<IconProps>;
  defaultStyle?: Style;
  children?: Array<string>;
};

export const WsComponentMeta = z.lazy(() =>
  z.object({
    type: z.enum([
      "container",
      "control",
      "embed",
      "rich-text",
      "rich-text-child",
    ]),
    label: z.string(),
    Component: z.any(),
    Icon: z.any(),
    defaultStyle: z.optional(z.any()),
    children: z.optional(z.array(z.string())),
  })
) as z.ZodType<WsComponentMeta<unknown>>;
