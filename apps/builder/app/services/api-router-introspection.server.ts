import { z } from "zod";
import {
  getInputSchemaMetadata,
  isHiddenPublicApiInputField,
} from "@webstudio-is/project-build/contracts/input-schema";

export type ApiRouterProcedure = {
  _def?: {
    query?: boolean;
    mutation?: boolean;
    inputs?: unknown[];
    meta?: {
      publicApiPermit?: unknown;
      publicApiOperation?: unknown;
    };
  };
};

export const getApiRouterProcedures = (apiRouter: unknown) =>
  (
    apiRouter as {
      _def: { procedures: Record<string, ApiRouterProcedure> };
    }
  )._def.procedures;

const getProcedureInputSchemas = (procedure: unknown) => {
  const inputs =
    (typeof procedure === "object" || typeof procedure === "function") &&
    procedure !== null &&
    "_def" in procedure
      ? (procedure as ApiRouterProcedure)._def?.inputs
      : undefined;
  return (inputs ?? []).filter(
    (input): input is z.ZodTypeAny =>
      typeof input === "object" &&
      input !== null &&
      "_def" in input &&
      "parse" in input
  );
};

export const getProcedureInputSchemaMetadata = (procedure: unknown) =>
  getProcedureInputSchemas(procedure).reduce(
    (metadata, schema) => {
      const schemaMetadata = getInputSchemaMetadata(schema, {
        isHiddenField: isHiddenPublicApiInputField,
      });
      return {
        inputFields: [...metadata.inputFields, ...schemaMetadata.inputFields],
        requiredInputFields: [
          ...metadata.requiredInputFields,
          ...schemaMetadata.requiredInputFields,
        ],
        inputFieldTypes: {
          ...metadata.inputFieldTypes,
          ...schemaMetadata.inputFieldTypes,
        },
      };
    },
    {
      inputFields: [] as string[],
      requiredInputFields: [] as string[],
      inputFieldTypes: {} as Partial<Record<string, "array">>,
    }
  );

export const getProcedurePublicApiPermit = (procedure: unknown) =>
  (typeof procedure === "object" || typeof procedure === "function") &&
  procedure !== null &&
  "_def" in procedure
    ? (procedure as ApiRouterProcedure)._def?.meta?.publicApiPermit
    : undefined;

export const getProcedurePublicApiOperation = (procedure: unknown) =>
  (typeof procedure === "object" || typeof procedure === "function") &&
  procedure !== null &&
  "_def" in procedure
    ? (procedure as ApiRouterProcedure)._def?.meta?.publicApiOperation
    : undefined;

export const getProcedureMethod = (procedure: unknown) => {
  const definition =
    (typeof procedure === "object" || typeof procedure === "function") &&
    procedure !== null &&
    "_def" in procedure
      ? (procedure as ApiRouterProcedure)._def
      : undefined;
  if (definition?.query === true) {
    return "query" as const;
  }
  if (definition?.mutation === true) {
    return "mutation" as const;
  }
};
