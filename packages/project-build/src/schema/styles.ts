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

export const StoredStyleDecl = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: z.union([StoredImageValue, SharedStyleValue]),
});

export type StoredStyleDecl = z.infer<typeof StoredStyleDecl>;

export const StoredStyles = z.array(StoredStyleDecl);

export type StoredStyles = z.infer<typeof StoredStyles>;

export const StyleDecl = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: z.union([ImageValue, SharedStyleValue]),
});

export type StyleDecl = z.infer<typeof StyleDecl>;

export const Styles = z.array(StyleDecl);

export type Styles = z.infer<typeof Styles>;
