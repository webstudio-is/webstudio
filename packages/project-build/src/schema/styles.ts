import { z } from "zod";
import {
  type StyleProperty,
  SharedStyleValue,
  ImageValue,
  LayersValue,
  UnitValue,
  KeywordValue,
  UnparsedValue,
  InvalidValue,
  TupleValue,
} from "@webstudio-is/css-data";

const StoredImageValue = z.object({
  type: z.literal("image"),
  value: z.object({ type: z.literal("asset"), value: z.string() }),

  // For the builder we want to be able to hide images
  hidden: z.boolean().optional(),
});

const StoredLayersValue = z.object({
  type: z.literal("layers"),
  value: z.array(
    z.union([
      UnitValue,
      KeywordValue,
      UnparsedValue,
      StoredImageValue,
      TupleValue,
      InvalidValue,
    ])
  ),
});

export const StoredStyleDecl = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  state: z.optional(z.string()),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: z.union([StoredImageValue, StoredLayersValue, SharedStyleValue]),
});

export type StoredStyleDecl = z.infer<typeof StoredStyleDecl>;

export const StoredStyles = z.array(StoredStyleDecl);

export type StoredStyles = z.infer<typeof StoredStyles>;

export const StyleDecl = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  state: z.optional(z.string()),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: z.union([ImageValue, LayersValue, SharedStyleValue]),
});

export type StyleDecl = z.infer<typeof StyleDecl>;

export type StyleDeclKey = string;

export const getStyleDeclKey = (
  styleDecl: Omit<StyleDecl, "value">
): StyleDeclKey => {
  return `${styleDecl.styleSourceId}:${styleDecl.breakpointId}:${
    styleDecl.property
  }:${styleDecl.state ?? ""}`;
};

export const Styles = z.map(z.string() as z.ZodType<StyleDeclKey>, StyleDecl);

export type Styles = z.infer<typeof Styles>;
