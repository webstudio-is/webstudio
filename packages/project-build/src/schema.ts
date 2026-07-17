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
import {
  marketplaceProduct,
  type MarketplaceProduct,
} from "./shared/marketplace";
import {
  projectSettings,
  type ProjectSettings,
} from "./shared/project-settings";

const entry = <Value extends z.ZodTypeAny>(value: Value) =>
  z.tuple([z.string(), value]);

type SchemaShape<Value extends object> = {
  [Key in keyof Required<Value>]: z.ZodType<Value[Key], unknown>;
};

export type SerializedBuild = Omit<
  Build,
  "marketplaceProduct" | "pages" | "projectSettings"
> & {
  pages: SerializedPages;
  marketplaceProduct?: MarketplaceProduct;
  projectSettings?: ProjectSettings;
};

const serializedBuildShape = {
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
  marketplaceProduct: marketplaceProduct.optional(),
  projectSettings: projectSettings.optional(),
  deployment: deployment.optional(),
} satisfies SchemaShape<SerializedBuild>;

// Canonical project-build contract for API-facing serialized builds.
// API packages compose this schema; they should not copy or maintain it.
export const serializedBuild: z.ZodObject<typeof serializedBuildShape> =
  z.object(serializedBuildShape);

const serializedBuilderState = serializedBuild
  .omit({
    id: true,
    projectId: true,
    version: true,
    createdAt: true,
    updatedAt: true,
    deployment: true,
  })
  .partial();

export const serializedRestorePointState = serializedBuilderState.extend({
  marketplaceProduct: marketplaceProduct.nullable().optional(),
});
