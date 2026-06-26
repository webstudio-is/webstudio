import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts/builder-runtime";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "@webstudio-is/project-build/contracts/namespaces";

export type PublicApiOperationNamespace = BuilderNamespace;

export const publicApiOperationNamespaces = builderNamespaces;

export type PublicRuntimeOperationContract = {
  id: string;
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
