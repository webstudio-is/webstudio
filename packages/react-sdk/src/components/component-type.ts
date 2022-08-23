import type { Style } from "../css";
import { z } from "zod";

export type WsComponentMeta<ComponentType> = {
  Component: ComponentType;

  // @todo: can we do better than `any` here?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;

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

export const WsComponentMetaSchema = z.lazy(() =>
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

    // We need these restrictions because of limitation of current drag&drop implementation.
    // We need drop target components to never have `string` in their children, only Instances.
    // Otherwise placement index detection will be confused.
    .refine(
      (val) =>
        val.canAcceptChildren === false || val.isContentEditable === false,
      {
        message:
          "Content editable componetns are not allowed to accept children via drag&drop",
        path: ["canAcceptChildren"],
      }
    )
    .refine(
      (val) => val.children === undefined || val.isContentEditable === true,
      {
        // @todo: consider adding the same check in the InstanceSchema
        message:
          "Non-content editable componetns are not allowed to have `string` children",
        path: ["children"],
      }
    )
) as z.ZodType<WsComponentMeta<unknown>>;
