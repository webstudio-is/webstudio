import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts/builder-runtime";
import { builderNamespaces } from "@webstudio-is/project-build/contracts/namespaces";

export const publicApiOperationNamespaces = builderNamespaces;
export type PublicApiOperationNamespace =
  (typeof publicApiOperationNamespaces)[number];

export type PublicRuntimeOperationId = string;

export type PublicRuntimeOperationContract = {
  id: PublicRuntimeOperationId;
  readNamespaces: readonly PublicApiOperationNamespace[];
  writeNamespaces: readonly PublicApiOperationNamespace[];
  invalidatesNamespaces: readonly PublicApiOperationNamespace[];
  retryOnConflict: boolean;
};

export const publicRuntimeOperationContracts: readonly PublicRuntimeOperationContract[] =
  runtimeOperationContracts.map(
    ({
      id,
      readNamespaces,
      writeNamespaces,
      invalidatesNamespaces,
      retryOnConflict,
    }): PublicRuntimeOperationContract => ({
      id,
      readNamespaces,
      writeNamespaces,
      invalidatesNamespaces,
      retryOnConflict,
    })
  );
