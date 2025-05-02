import { z } from "zod";

const DataSourceId = z.string();

export const DataSourceVariableValue = z.union([
  z.object({
    type: z.literal("number"),
    // initial value of variable store
    value: z.number(),
  }),
  z.object({
    type: z.literal("string"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("boolean"),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("string[]"),
    value: z.array(z.string()),
  }),
  z.object({
    type: z.literal("json"),
    value: z.unknown(),
  }),
]);

export const DataSource = z.union([
  z.object({
    type: z.literal("variable"),
    id: DataSourceId,
    // The instance should always be specified for variables,
    // however, there was a bug in the embed template
    // which produced variables without an instance
    // and these variables will fail validation
    // if we make it required
    scopeInstanceId: z.string().optional(),
    name: z.string(),
    value: DataSourceVariableValue,
  }),
  z.object({
    type: z.literal("parameter"),
    id: DataSourceId,
    scopeInstanceId: z.string().optional(),
    name: z.string(),
  }),
  z.object({
    type: z.literal("resource"),
    id: DataSourceId,
    scopeInstanceId: z.string().optional(),
    name: z.string(),
    resourceId: z.string(),
  }),
]);

export type DataSource = z.infer<typeof DataSource>;

export const DataSources = z.map(DataSourceId, DataSource);

export type DataSources = z.infer<typeof DataSources>;
