import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts/builder-runtime";
import { type BuilderNamespace } from "@webstudio-is/project-build/contracts/namespaces";

export type PublicApiOperationNamespace = BuilderNamespace;

export type PublicRuntimeOperationContract = {
  id: string;
  readNamespaces: readonly PublicApiOperationNamespace[];
  writeNamespaces: readonly PublicApiOperationNamespace[];
  invalidatesNamespaces: readonly PublicApiOperationNamespace[];
};

export const publicRuntimeOperationContracts: readonly PublicRuntimeOperationContract[] =
  runtimeOperationContracts.map(
    ({
      id,
      readNamespaces,
      writeNamespaces,
      invalidatesNamespaces,
    }): PublicRuntimeOperationContract => ({
      id,
      readNamespaces,
      writeNamespaces,
      invalidatesNamespaces,
    })
  );
