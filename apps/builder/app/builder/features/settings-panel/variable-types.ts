import type { DataSource } from "@webstudio-is/sdk";
import type { buildEmailRequestPreview } from "./email-request-preview";

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
  showSavedResourceRequest: boolean;
  isComputingRequest: boolean;
  onLoadData: () => void;
  onLoadEmailRequest?: () => void;
  emailRequestPreview?: Awaited<ReturnType<typeof buildEmailRequestPreview>>;
  queryActive: boolean;
  queryPending: boolean;
  queryContainerRef: (element: HTMLDivElement | null) => void;
};
