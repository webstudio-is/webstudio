import { z } from "zod";
import {
  type StyleProperty,
  SharedStyleValue,
  ImageValue,
} from "@webstudio-is/css-data";

const StoredImageValue = z.object({
  type: z.literal("image"),
  value: z.array(z.object({ type: z.literal("asset"), value: z.string() })),
});

export const StoredStylesItem = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: z.union([StoredImageValue, SharedStyleValue]),
});

export type StoredStylesItem = z.infer<typeof StoredStylesItem>;

export const StoredStyles = z.array(StoredStylesItem);

export type StoredStyles = z.infer<typeof StoredStyles>;

export const StylesItem = z.object({
  breakpointId: z.string(),
  instanceId: z.string(),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: z.union([ImageValue, SharedStyleValue]),
});

export type StylesItem = z.infer<typeof StylesItem>;

export const Styles = z.array(StylesItem);

export type Styles = z.infer<typeof Styles>;
