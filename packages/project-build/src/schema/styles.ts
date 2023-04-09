import { z } from "zod";
import { type StyleProperty, StyleValue } from "@webstudio-is/css-data";

export const StyleDecl = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  state: z.optional(z.string()),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: StyleValue,
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

export const StylesList = z.array(StyleDecl);

export type StylesList = z.infer<typeof StylesList>;

export const Styles = z.map(z.string() as z.ZodType<StyleDeclKey>, StyleDecl);

export type Styles = z.infer<typeof Styles>;
