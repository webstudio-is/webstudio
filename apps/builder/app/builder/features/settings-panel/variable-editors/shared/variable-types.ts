import type { DataSource } from "@webstudio-is/sdk";

export type VariableType =
  | "parameter"
  | "string"
  | "number"
  | "boolean"
  | "json"
  | "resource"
  | "email-resource"
  | "graphql-resource"
  | "sitemap-resource"
  | "current-date-resource"
  | "assets-resource";

export type VariablePreviewProps = {
  variable?: DataSource;
  variableType: VariableType;
  variableValue: unknown;
};
