import { nanoid } from "nanoid";
import type { MaterializedContentRoot } from "./content-storage";
import type { ContentStorageChange } from "./mutation";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderNamespace } from "../contracts/namespaces";
import type {
  ContentBlockDiagnostic,
  ContentBlockExternalContentIdentity,
  ContentBlockSource,
} from "@webstudio-is/sdk";

export type ContentBlockSourceInspection = Readonly<{
  blockInstanceId: string;
  renderScope: string;
  configuredSource?: ContentBlockSource;
  resolvedIdentity?: ContentBlockExternalContentIdentity;
  sessionStatus:
    | "disconnected"
    | "saved"
    | "pending"
    | "conflicting"
    | "cancelled"
    | "recoverable"
    | "failed";
  pending: boolean;
  diagnostics: readonly ContentBlockDiagnostic[];
  capabilities: Readonly<{
    canConnect: boolean;
    canSwitch: boolean;
    canDisconnectWithCopy: boolean;
    canEdit: boolean;
  }>;
  repairRoutes: readonly ("open-file" | "disconnect-with-copy")[];
}>;

export type ContentBlockPersistenceStep = Readonly<{
  type: "asset" | "project";
  status: "saved" | "failed" | "not-attempted";
  root?: ContentBlockExternalContentIdentity;
  code?: string;
  message?: string;
}>;

export type ContentBlockPersistenceResult = Readonly<{
  status: "complete" | "partial" | "failed";
  steps: readonly ContentBlockPersistenceStep[];
  retry: Readonly<{
    replan: true;
    roots: readonly ContentBlockExternalContentIdentity[];
    project: boolean;
  }>;
}>;

export type ContentStorageApplication = Readonly<{
  getMaterializedContent: () => readonly MaterializedContentRoot[];
  preflightStorageChanges: (
    changes: readonly ContentStorageChange[]
  ) => Promise<
    | Readonly<{ status: "ready" }>
    | Readonly<{
        status: "failed";
        code: string;
        message: string;
        persistence: ContentBlockPersistenceResult;
      }>
  >;
  saveStorageChanges: (changes: readonly ContentStorageChange[]) => Promise<
    | Readonly<{
        status: "complete";
        persistence: ContentBlockPersistenceResult;
      }>
    | Readonly<{
        status: "failed" | "partial";
        code: string;
        message: string;
        persistence: ContentBlockPersistenceResult;
      }>
  >;
  inspectSource?: (input: {
    blockInstanceId: string;
    renderScope: string;
    load?: boolean;
    variables?: Readonly<Record<string, unknown>>;
  }) => Promise<ContentBlockSourceInspection>;
  applyLifecycle?: (
    input: {
      action: "connect" | "switch" | "disconnect";
      blockInstanceId: string;
      renderScope: string;
      source?: ContentBlockSource;
      dryRun?: boolean;
      confirmationToken?: string;
      variables?: Readonly<Record<string, unknown>>;
    },
    execution?: {
      commitProjectPayload?: (
        payload: readonly BuilderPatchChange[]
      ) => void | Promise<void>;
    }
  ) => Promise<
    | Readonly<{
        status: "complete";
        result: ContentBlockLifecyclePlan;
      }>
    | Readonly<{
        status: "confirmation-required";
        code: "content-source-confirmation-required";
        confirmationToken: string;
        confirmationExpiresAt: string;
        result: ContentBlockLifecyclePlan;
      }>
    | Readonly<{
        status: "blocked" | "partial";
        code: string;
        message: string;
        result?: ContentBlockLifecyclePlan;
      }>
  >;
  semanticEdit?: (input: {
    operationId: string;
    input: unknown;
    blockInstanceId: string;
    renderScope: string;
    variables?: Readonly<Record<string, unknown>>;
    dryRun?: boolean;
  }) => Promise<
    | Readonly<{ status: "complete"; result: unknown }>
    | Readonly<{
        status: "blocked" | "partial";
        code: string;
        message: string;
        result?: unknown;
      }>
  >;
  migrateTemplateReferences?: (input: {
    templateInstanceId: string;
    migration:
      | Readonly<{ type: "rename"; to: string }>
      | Readonly<{ type: "remove" }>;
    renderScope: string;
    variables?: Readonly<Record<string, unknown>>;
    selectedAssetIds?: readonly string[];
    dryRun?: boolean;
    confirmationToken?: string;
  }) => Promise<
    Readonly<{
      status: "complete" | "partial" | "blocked" | "confirmation-required";
      code?: string;
      message?: string;
      discoveryComplete: boolean;
      updateCount: number;
      omissionCount: number;
      changedAsset?: boolean;
      files: readonly Readonly<{
        assetId: string;
        revision?: string;
        contentRef: string;
        changed?: boolean;
        status?: "updated" | "unchanged" | "failed";
        updateCount: number;
        omissionCount: number;
        diagnostics: readonly Readonly<{ code: string; message: string }>[];
      }>[];
      diagnostics?: readonly Readonly<{ code: string; message: string }>[];
      confirmationToken?: string;
      confirmationExpiresAt?: string;
    }>
  >;
}>;

type ContentBlockLifecyclePlan = Readonly<{
  action: "connect" | "switch" | "disconnect";
  changesProject: boolean;
  diagnostics: readonly ContentBlockDiagnostic[];
}>;

export type BuilderRuntimeContext = {
  createId: () => string;
  projectId?: string;
  projectVersion?: number;
  allowLegacyContentModelWarnings?: boolean;
  materializedContent?: readonly MaterializedContentRoot[];
  returnStorageChanges?: boolean;
  contentStorageApplication?: ContentStorageApplication;
  applicationDryRun?: boolean;
  commitApplicationProjectPayload?: (input: {
    payload: readonly BuilderPatchChange[];
    expectedVersion: number;
    operationId: string;
    invalidatesNamespaces: readonly BuilderNamespace[];
  }) => Promise<{ version: number }>;
};

export const builderRuntimeContext: BuilderRuntimeContext = {
  createId: nanoid,
};
