import { z } from "zod";

const dataSourceId = z.string();

const numberDataSourceVariableValue = z.object({
  type: z.literal("number"),
  // initial value of variable store
  value: z.number(),
});

const stringDataSourceVariableValue = z.object({
  type: z.literal("string"),
  value: z.string(),
});

const booleanDataSourceVariableValue = z.object({
  type: z.literal("boolean"),
  value: z.boolean(),
});

const jsonDataSourceVariableValue = z
  .object({
    type: z.literal("json"),
    value: z.unknown().optional(),
  })
  .transform((value) => ({ ...value, value: value.value ?? null }));

export const dataSourceVariableValue = z.union([
  numberDataSourceVariableValue,
  stringDataSourceVariableValue,
  booleanDataSourceVariableValue,
  jsonDataSourceVariableValue,
]);

const legacyStringArrayDataSourceVariableValue = z.object({
  type: z.literal("string[]"),
  value: z.array(z.string()),
});

const persistedDataSourceVariableValue = z.preprocess((value) => {
  // Older builds used a dedicated string-array variable type. Normalize it
  // while parsing so all arrays use the general JSON representation.
  const legacyValue = legacyStringArrayDataSourceVariableValue.safeParse(value);
  return legacyValue.success
    ? { type: "json", value: legacyValue.data.value }
    : value;
}, dataSourceVariableValue);

export const dataSource = z.union([
  z.object({
    type: z.literal("variable"),
    id: dataSourceId,
    // The instance should always be specified for variables,
    // however, there was a bug in the embed template
    // which produced variables without an instance
    // and these variables will fail validation
    // if we make it required
    scopeInstanceId: z.string().optional(),
    name: z.string(),
    value: persistedDataSourceVariableValue,
  }),
  z.object({
    type: z.literal("parameter"),
    id: dataSourceId,
    scopeInstanceId: z.string().optional(),
    name: z.string(),
  }),
  z.object({
    type: z.literal("resource"),
    id: dataSourceId,
    scopeInstanceId: z.string().optional(),
    name: z.string(),
    resourceId: z.string(),
  }),
]);

export type DataSource = z.infer<typeof dataSource>;

export const dataSources = z.map(dataSourceId, dataSource);

export type DataSources = z.infer<typeof dataSources>;
