import {
  Breakpoint,
  DataSource,
  Deployment,
  Instance,
  Prop,
  Resource,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk/schema";
import {
  SerializedPagesSchema,
  type SerializedPages,
} from "@webstudio-is/project-migrations/pages";
import { z } from "zod";
import type { Build } from "./types";

const entrySchema = <Value extends z.ZodTypeAny>(value: Value) =>
  z.tuple([z.string(), value]);

type SchemaShape<Value extends object> = {
  [Key in keyof Required<Value>]: z.ZodType<Value[Key], z.ZodTypeDef, unknown>;
};

export type SerializedBuild = Omit<Build, "marketplaceProduct" | "pages"> & {
  pages: SerializedPages;
};

const serializedBuildShape: SchemaShape<SerializedBuild> = {
  id: z.string(),
  projectId: z.string(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pages: SerializedPagesSchema,
  breakpoints: z.array(entrySchema(Breakpoint)),
  styles: z.array(entrySchema(StyleDecl)),
  styleSources: z.array(entrySchema(StyleSource)),
  styleSourceSelections: z.array(entrySchema(StyleSourceSelection)),
  props: z.array(entrySchema(Prop)),
  instances: z.array(entrySchema(Instance)),
  dataSources: z.array(entrySchema(DataSource)),
  resources: z.array(entrySchema(Resource)),
  deployment: Deployment.optional(),
};

// Canonical project-build schema entrypoint for API-facing serialized builds.
// API packages compose this schema; they should not copy or maintain it.
export const SerializedBuildSchema: z.ZodObject<typeof serializedBuildShape> =
  z.object(serializedBuildShape);
