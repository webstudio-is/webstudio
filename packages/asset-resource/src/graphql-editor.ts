import { parse, print } from "graphql";
import {
  getAutocompleteSuggestions,
  getDiagnostics,
  Position,
} from "graphql-language-service";
import type { BuilderAssetFieldCatalog } from "@webstudio-is/sdk";
import { createAssetGraphqlSchemaFromCatalog } from "./graphql";

export type AssetGraphqlEditorDiagnostic = {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity?: 1 | 2 | 3 | 4;
  message: string;
};

export type AssetGraphqlEditorCompletion = {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | null;
  insertText?: string;
  insertTextFormat?: 1 | 2;
};

export type AssetGraphqlEditor = {
  format: (query: string) => string;
  diagnostics: (query: string) => AssetGraphqlEditorDiagnostic[];
  completions: (
    query: string,
    position: { line: number; character: number }
  ) => AssetGraphqlEditorCompletion[];
};

export const createAssetGraphqlEditor = (
  catalog: BuilderAssetFieldCatalog
): AssetGraphqlEditor => {
  const schema = createAssetGraphqlSchemaFromCatalog(catalog);
  return {
    format: (query) => {
      try {
        return print(parse(query));
      } catch {
        return query;
      }
    },
    diagnostics: (query) =>
      getDiagnostics(query, schema).map((diagnostic) => ({
        range: diagnostic.range,
        severity: diagnostic.severity,
        message:
          typeof diagnostic.message === "string"
            ? diagnostic.message
            : diagnostic.message.value,
      })),
    completions: (query, position) =>
      getAutocompleteSuggestions(
        schema,
        query,
        new Position(position.line, position.character)
      ).map((completion) =>
        completion.kind === 6
          ? {
              ...completion,
              insertText: completion.label,
              insertTextFormat: 1,
            }
          : completion
      ),
  };
};
