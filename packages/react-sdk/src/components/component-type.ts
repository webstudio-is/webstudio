import { z } from "zod";
import type { FunctionComponent } from "react";
import { IconProps } from "@webstudio-is/icons";
import type { Style } from "@webstudio-is/css-data";

export type WsComponentMeta<ComponentType> = {
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
