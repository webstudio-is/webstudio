import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts/builder-runtime";
import { builderNamespaces } from "@webstudio-is/project-build/contracts/namespaces";
import { builderApiCapabilities } from "@webstudio-is/project-build/contracts/permissions";

export const publicApiOperationNamespaces = builderNamespaces;
export type PublicApiOperationNamespace =
  (typeof publicApiOperationNamespaces)[number];

export const publicApiOperationPermits = builderApiCapabilities;
export type PublicApiOperationPermit =
  (typeof publicApiOperationPermits)[number];
export type PublicApiOperationKind = "read" | "mutation";
export type PublicRuntimeOperationId = string;

export type PublicRuntimeOperationContract = {
  id: PublicRuntimeOperationId;
  command: string;
  client: string;
  permit?: PublicApiOperationPermit;
  kind: PublicApiOperationKind;
  inputFields: readonly string[];
  requiredInputFields: readonly string[];
  inputFieldTypes: Partial<Record<string, "array">>;
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
      inputFields,
      requiredInputFields,
      inputFieldTypes,
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
      inputFields,
      requiredInputFields,
      inputFieldTypes,
      readNamespaces,
      writeNamespaces,
      invalidatesNamespaces,
      retryOnConflict,
      requiresAssets,
      requiresConfirm,
    })
  );
