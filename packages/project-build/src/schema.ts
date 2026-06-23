import {
  breakpoint,
  dataSource,
  deployment,
  instance,
  prop,
  resource,
  styleDecl,
  styleSource,
  styleSourceSelection,
} from "@webstudio-is/sdk/schema";
import {
  serializedPages,
  type SerializedPages,
} from "@webstudio-is/project-migrations/pages";
import { z } from "zod";
import type { Build } from "./types";

const entry = <Value extends z.ZodTypeAny>(value: Value) =>
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
  pages: serializedPages,
  breakpoints: z.array(entry(breakpoint)),
  styles: z.array(entry(styleDecl)),
  styleSources: z.array(entry(styleSource)),
  styleSourceSelections: z.array(entry(styleSourceSelection)),
  props: z.array(entry(prop)),
  instances: z.array(entry(instance)),
  dataSources: z.array(entry(dataSource)),
  resources: z.array(entry(resource)),
  deployment: deployment.optional(),
};

// Canonical project-build schema entrypoint for API-facing serialized builds.
// API packages compose this schema; they should not copy or maintain it.
export const serializedBuild: z.ZodObject<typeof serializedBuildShape> =
  z.object(serializedBuildShape);
