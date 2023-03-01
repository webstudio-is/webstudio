import { z } from "zod";
import {
  type StyleProperty,
  SharedStyleValue,
  ImageValue,
} from "@webstudio-is/css-data";

const StoredImageValue = z.object({
  type: z.literal("image"),
  value: z.object({ type: z.literal("asset"), value: z.string() }),
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

export type StyleDeclKey =
  `${StyleDecl["styleSourceId"]}:${StyleDecl["breakpointId"]}:${StyleDecl["property"]}`;

export const getStyleDeclKey = (
  styleDecl: Omit<StyleDecl, "value">
): StyleDeclKey => {
  return `${styleDecl.styleSourceId}:${styleDecl.breakpointId}:${styleDecl.property}`;
};

export const Styles = z.map(z.string() as z.ZodType<StyleDeclKey>, StyleDecl);

export type Styles = z.infer<typeof Styles>;
