import type { ComponentProps, JSXElementConstructor } from "react";
import type { Style } from "../css";
import { z } from "zod";
import React from "react";
import { IconProps } from "@webstudio-is/icons";
import type { InitialVisibleProps } from "../component-utils/types-helpers";

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
      initialVisibleProps: z.optional(z.record(z.unknown())),
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
);

type Prettify<T> = { [key in keyof T]: T[key] };

export type WsComponentMeta<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComponentType extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>
> = Prettify<
  {
    Component: ComponentType;
    Icon: React.FunctionComponent<IconProps>;
    defaultStyle?: Style;
    // Force all required props to have default value in `initialVisibleProps`
    initialVisibleProps?: InitialVisibleProps<ComponentProps<ComponentType>>;
  } & Omit<
    z.infer<typeof WsComponentMeta>,
    "Component" | "Icon" | "defaultStyle" | "initialVisibleProps"
  >
>;
