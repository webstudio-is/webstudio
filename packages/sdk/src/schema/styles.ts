import { z } from "zod";
import { type StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import type { Simplify } from "type-fest";

const StyleDeclRaw = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  state: z.optional(z.string()),
  // @todo can't figure out how to make property to be enum
  property: z.string(),
  value: StyleValue,
});

export type StyleDecl = Simplify<
  Omit<z.infer<typeof StyleDeclRaw>, "property"> & {
    property: StyleProperty;
  }
>;
export const StyleDecl = StyleDeclRaw as z.ZodType<StyleDecl>;

export type StyleDeclKey = string;

export const getStyleDeclKey = (
  styleDecl: Omit<StyleDecl, "value">
): StyleDeclKey => {
  return `${styleDecl.styleSourceId}:${styleDecl.breakpointId}:${
    styleDecl.property
  }:${styleDecl.state ?? ""}`;
};

export const Styles = z.map(z.string(), StyleDecl);

export type Styles = Map<string, StyleDecl>;
