import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts/builder-runtime";
import { builderNamespaces } from "@webstudio-is/project-build/contracts/namespaces";
import { builderApiCapabilities } from "@webstudio-is/project-build/contracts/permissions";
import type { InputJsonSchema } from "@webstudio-is/sdk";

export type { InputJsonSchema };

export const publicApiOperationNamespaces = builderNamespaces;
export type PublicApiOperationNamespace =
  (typeof publicApiOperationNamespaces)[number];

export const publicApiOperationPermits = builderApiCapabilities;
export type PublicApiOperationPermit =
  (typeof publicApiOperationPermits)[number];
export type PublicApiOperationKind = "read" | "mutation";
export type PublicRuntimeOperationId =
  (typeof runtimeOperationContracts)[number]["id"];

export type PublicRuntimeOperationContract = {
  id: PublicRuntimeOperationId;
  command: string;
  client: string;
  permit?: PublicApiOperationPermit;
  kind: PublicApiOperationKind;
  inputSchema: InputJsonSchema;
  readNamespaces: readonly PublicApiOperationNamespace[];
  writeNamespaces: readonly PublicApiOperationNamespace[];
  invalidatesNamespaces: readonly PublicApiOperationNamespace[];
  retryOnConflict: boolean;
  requiresAssets: boolean;
  requiresConfirm: boolean;
};

export const publicRuntimeOperationContracts: readonly PublicRuntimeOperationContract[] =
  runtimeOperationContracts.map(
    ({
      id,
      command,
      client,
      permit,
      kind,
      inputSchema,
      readNamespaces,
      writeNamespaces,
      invalidatesNamespaces,
      retryOnConflict,
      requiresAssets,
      requiresConfirm,
    }): PublicRuntimeOperationContract => ({
      id,
      command,
      client,
      permit,
      kind,
      inputSchema,
      readNamespaces,
      writeNamespaces,
      invalidatesNamespaces,
      retryOnConflict,
      requiresAssets,
      requiresConfirm,
    })
  );
