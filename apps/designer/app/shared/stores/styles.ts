import { z } from "zod";
import { StylesItem } from "@webstudio-is/react-sdk";

const SetStylesMessage = z.object({
  store: z.literal("styles"),
  operation: z.literal("set"),
  treeId: z.string(),
  data: StylesItem,
});

type SetStylesMessage = z.infer<typeof SetStylesMessage>;

const DeleteStylesMessage = z.object({
  store: z.literal("styles"),
  operation: z.literal("delete"),
  treeId: z.string(),
  data: StylesItem.omit({ value: true }) as z.ZodType<
    Omit<StylesItem, "value">
  >,
});

type DeleteStylesMessage = z.infer<typeof DeleteStylesMessage>;

export const StylesMessage = z.union([SetStylesMessage, DeleteStylesMessage]);

export type StylesMessage = z.infer<typeof StylesMessage>;
