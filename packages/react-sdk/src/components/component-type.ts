import { z } from "zod";
import React from "react";
import { IconProps } from "@webstudio-is/icons";
import type { Style } from "@webstudio-is/css-data";

export type WsComponentMeta<ComponentType> = {
  Component: ComponentType;
  Icon: React.FunctionComponent<IconProps>;
  defaultStyle?: Style;
  canAcceptChildren: boolean;
  // Should children of the component be editable?
  // Should only be possible for components like paragraph, heading etc.
  isContentEditable: boolean;
  // Components that render inside text editor only.
  isInlineOnly: boolean;
  // Should be listed in the components list.
  isListed: boolean;
  label: string;
  children?: Array<string>;
};

export const WsComponentMeta = z.lazy(() =>
  z
    .object({
      Component: z.any(),
      Icon: z.any(),
      defaultStyle: z.optional(z.any()),
      canAcceptChildren: z.boolean(),
      isContentEditable: z.boolean(),
      isInlineOnly: z.boolean(),
      isListed: z.boolean(),
      label: z.string(),
      children: z.optional(z.array(z.string())),
    })

    // We need these restrictions because of the limitation of the current drag&drop implementation.
    // Its position detection logic will be confused if drop target has `string` children.
    .refine(
      (val) =>
        val.isContentEditable === false || val.canAcceptChildren === false,
      {
        message:
          "Content editable componetns are not allowed to accept children via drag&drop, because they may have `string` children",
        path: ["canAcceptChildren"],
      }
    )
    .refine(
      (val) =>
        val.canAcceptChildren === false ||
        val.children === undefined ||
        val.children.every((child) => typeof child !== "string"),
      {
        message:
          "Components that can accept children via drag&drop are not allowed to have `string` children",
        path: ["children"],
      }
    )
) as z.ZodType<WsComponentMeta<unknown>>;
