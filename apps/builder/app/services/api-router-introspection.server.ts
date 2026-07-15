import { z } from "zod";
import {
  emptyInputSchemaMetadata,
  getInputSchemaMetadata,
  isHiddenPublicApiInputField,
  mergeInputSchemaMetadata,
  type InputSchemaMetadata,
} from "@webstudio-is/project-build/contracts";

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

const getProcedureDefinition = (procedure: unknown) =>
  (typeof procedure === "object" || typeof procedure === "function") &&
  procedure !== null &&
  "_def" in procedure
    ? (procedure as ApiRouterProcedure)._def
    : undefined;

const getProcedureInputSchemas = (procedure: unknown) => {
  const inputs = getProcedureDefinition(procedure)?.inputs;
  return (inputs ?? []).filter(
    (input): input is z.ZodTypeAny => input instanceof z.ZodType
  );
};

export const getProcedureInputSchemaMetadata = (procedure: unknown) =>
  getProcedureInputSchemas(procedure).reduce<InputSchemaMetadata>(
    (metadata, schema) =>
      mergeInputSchemaMetadata(
        metadata,
        getInputSchemaMetadata(schema, {
          isHiddenField: isHiddenPublicApiInputField,
        })
      ),
    emptyInputSchemaMetadata
  );

export const getProcedurePublicApiPermit = (procedure: unknown) =>
  getProcedureDefinition(procedure)?.meta?.publicApiPermit;

export const getProcedurePublicApiOperation = (procedure: unknown) =>
  getProcedureDefinition(procedure)?.meta?.publicApiOperation;

export const getProcedureMethod = (procedure: unknown) => {
  const definition = getProcedureDefinition(procedure);
  if (definition?.query === true) {
    return "query" as const;
  }
  if (definition?.mutation === true) {
    return "mutation" as const;
  }
};
