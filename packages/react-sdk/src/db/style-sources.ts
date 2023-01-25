import { z } from "zod";
import {
  StoredImageValue,
  ImageValue,
  SharedStyleValue,
  StyleProperty,
} from "@webstudio-is/css-data";

const StyleSourcesToken = z.object({
  type: z.literal("token"),
  id: z.string(),
  name: z.string(),
});

export const StyleSourcesItem = StyleSourcesToken;

export const StyleSources = z.array(StyleSourcesItem);

export const StoredStyleSourceStylesItem = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  property: StyleProperty,
  value: z.union([StoredImageValue, SharedStyleValue]),
});

export const StoredStyleSourceStyles = z.array(StoredStyleSourceStylesItem);

export const StyleSourceStylesItem = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  property: StyleProperty,
  value: z.union([ImageValue, SharedStyleValue]),
});

export const StyleSourceStyles = z.array(StyleSourceStylesItem);

const StyleRefsLocal = z.object({
  type: z.literal("local"),
  instanceId: z.string(),
});

const StyleRefsRemote = z.object({
  type: z.literal("remote"),
  styleSourceId: z.string(),
  instanceId: z.string(),
});

export const StyleRefsItem = z.union([StyleRefsLocal, StyleRefsRemote]);

export const StyleRefs = z.array(StyleRefsItem);
