import { runtimeOperationContractData } from "./__generated__/runtime-operation-contracts";
import type { InputJsonSchema } from "@webstudio-is/sdk";
import type { BuilderNamespace } from "./namespaces";
import type { BuilderApiCapability } from "./permissions";

export type RuntimeOperationKind = "read" | "mutation";

export type RuntimeOperationPublicApiPermit = BuilderApiCapability;

export type RuntimeOperationPublicApi = {
  command: string;
  client: string;
  permit?: RuntimeOperationPublicApiPermit;
};

export type RuntimeOperationStateContract = {
  id: string;
  kind: RuntimeOperationKind;
  inputSchema: InputJsonSchema;
  outputSchema: InputJsonSchema;
  readNamespaces: readonly BuilderNamespace[];
  writeNamespaces: readonly BuilderNamespace[];
  invalidatesNamespaces: readonly BuilderNamespace[];
  retryOnConflict: boolean;
  requiresAssets: boolean;
  requiresConfirm: boolean;
};

export type RuntimeOperationContract = RuntimeOperationStateContract &
  RuntimeOperationPublicApi;

export const runtimeOperationContracts: readonly (RuntimeOperationContract & {
  id: RuntimeOperationId;
})[] = runtimeOperationContractData.map((contract) => ({
  permit: undefined,
  requiresAssets: false,
  requiresConfirm: false,
  ...contract,
}));

export type RuntimeOperationId =
  (typeof runtimeOperationContractData)[number]["id"];
