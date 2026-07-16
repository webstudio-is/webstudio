import hash from "@emotion/hash";
import { serverOnlyRouterOperationMetadata } from "./__generated__/server-only-router-operation-metadata";
import { localOnlyOperationInputs } from "./local-operation-inputs";
import { publicApiOperationDocumentation } from "./operation-docs";
import { getInputJsonSchemaMetadata } from "@webstudio-is/sdk";
import {
  publicRuntimeOperationContracts,
  type InputJsonSchema,
  type PublicApiOperationNamespace,
  type PublicApiOperationPermit,
  type PublicRuntimeOperationId,
} from "./runtime-contracts";
export type {
  PublicApiOperationNamespace,
  PublicApiOperationPermit,
} from "./runtime-contracts";

export type PublicApiOperationMethod = "query" | "mutation";
export type PublicApiOperationOwner =
  | "runtime"
  | "raw-build-patch"
  | "server-infrastructure"
  | "local-side-effect";

export type PublicApiCommand =
  (typeof publicApiOperationDocumentation)[number]["command"];

type PublicApiOperationInput<Command extends string = string> = {
  command: Command;
  id: string;
  method: PublicApiOperationMethod;
  path?: string;
  client: string;
  permit?: PublicApiOperationPermit;
  invalidatesNamespaces?: readonly PublicApiOperationNamespace[];
  inputSchema?: InputJsonSchema;
};

export type PublicApiOperation<Command extends string = string> = Omit<
  PublicApiOperationInput,
  "command" | "permit"
> & {
  command: Command;
  permit: PublicApiOperationPermit;
  description: string;
  inputFields: readonly string[];
  requiredInputFields: readonly string[];
  inputFieldTypes: Partial<Record<string, "array">>;
  inputSchema: InputJsonSchema;
  outputSchema?: InputJsonSchema;
  requiredOptions?: readonly string[];
  examples: readonly string[];
  localCapable: boolean;
  serverOnly: boolean;
  semanticOwner: PublicApiOperationOwner;
  runtimeOperationId?: PublicRuntimeOperationId;
  readNamespaces: readonly PublicApiOperationNamespace[];
  writeNamespaces: readonly PublicApiOperationNamespace[];
  invalidatesNamespaces: readonly PublicApiOperationNamespace[];
  retryOnConflict: boolean;
  requiresAssets: boolean;
  requiresConfirm: boolean;
};

const runtimeOperationById = new Map(
  publicRuntimeOperationContracts.map((contract) => [contract.id, contract])
);
const documentationByCommand: Map<
  string,
  (typeof publicApiOperationDocumentation)[number]
> = new Map(
  publicApiOperationDocumentation.map((documentation) => [
    documentation.command,
    documentation,
  ])
);

const withDefaultPermit = <Operation extends PublicApiOperationInput>(
  operation: Operation
): PublicApiOperation<Operation["command"]> => {
  const documentation = documentationByCommand.get(operation.command);
  if (documentation === undefined) {
    throw new Error(
      `Missing public API operation documentation for "${operation.command}".`
    );
  }
  const runtimeOperation = runtimeOperationById.get(
    operation.id as PublicRuntimeOperationId
  );
  const inputSchema = operation.inputSchema ?? runtimeOperation?.inputSchema;
  if (inputSchema === undefined) {
    throw new Error(
      `Missing public API input schema for "${operation.command}".`
    );
  }
  const { inputFields, requiredInputFields, inputFieldTypes } =
    getInputJsonSchemaMetadata(inputSchema);
  return {
    ...operation,
    permit:
      operation.permit ?? (operation.method === "query" ? "view" : "build"),
    description: documentation.description,
    inputFields,
    requiredInputFields,
    inputFieldTypes,
    inputSchema,
    ...(runtimeOperation?.outputSchema === undefined
      ? {}
      : { outputSchema: runtimeOperation.outputSchema }),
    requiredOptions:
      "requiredOptions" in documentation
        ? documentation.requiredOptions
        : undefined,
    examples: documentation.examples,
    localCapable: runtimeOperation !== undefined,
    serverOnly: runtimeOperation === undefined,
    semanticOwner:
      runtimeOperation !== undefined
        ? "runtime"
        : operation.id === "build.patch"
          ? "raw-build-patch"
          : operation.id === "assets.upload" ||
              operation.id === "assets.uploadMany"
            ? "local-side-effect"
            : "server-infrastructure",
    runtimeOperationId: runtimeOperation?.id,
    readNamespaces: runtimeOperation?.readNamespaces ?? [],
    writeNamespaces: runtimeOperation?.writeNamespaces ?? [],
    invalidatesNamespaces:
      runtimeOperation?.invalidatesNamespaces ??
      operation.invalidatesNamespaces ??
      [],
    retryOnConflict: runtimeOperation?.retryOnConflict ?? false,
    requiresAssets: runtimeOperation?.requiresAssets ?? false,
    requiresConfirm: runtimeOperation?.requiresConfirm ?? false,
  };
};

const nonRuntimeOperationInputs = [
  ...Object.values(serverOnlyRouterOperationMetadata),
  ...localOnlyOperationInputs,
] satisfies readonly PublicApiOperationInput[];

const runtimeOperationInputs = publicRuntimeOperationContracts.map(
  (operation) =>
    ({
      command: operation.command,
      id: operation.id,
      method: operation.kind === "read" ? "query" : "mutation",
      path: "api." + operation.id,
      client: operation.client,
      permit: operation.permit,
    }) satisfies PublicApiOperationInput
);

const operationInputByCommand = new Map<string, PublicApiOperationInput>();
for (const operation of [
  ...nonRuntimeOperationInputs,
  ...runtimeOperationInputs,
]) {
  if (operationInputByCommand.has(operation.command)) {
    throw new Error(`Duplicate public API command "${operation.command}".`);
  }
  operationInputByCommand.set(operation.command, operation);
}

const getOperationInputByCommand = <Command extends PublicApiCommand>(
  command: Command
): PublicApiOperationInput<Command> => {
  const operation = operationInputByCommand.get(command);
  if (operation === undefined) {
    throw new Error(
      'Missing public API operation input for "' + command + '".'
    );
  }
  return { ...operation, command };
};

export const publicApiOperations = publicApiOperationDocumentation.map(
  ({ command }) => withDefaultPermit(getOperationInputByCommand(command))
);

const operationsRequiringNegotiatedServerSupport = new Set([
  "instances.insertComponent",
  "instances.insertCollection",
  "instances.insertFragment",
]);

export const publicApiOperationRequiresServerSupport = (operation: {
  id: string;
  serverOnly: boolean;
}) =>
  operation.serverOnly ||
  operationsRequiringNegotiatedServerSupport.has(operation.id);

export const publicApiContractVersion = `public-api:${hash(
  JSON.stringify(
    publicApiOperations.map(({ command, id, method, path, serverOnly }) => ({
      command,
      id,
      method,
      path,
      serverOnly,
      requiresServerSupport: publicApiOperationRequiresServerSupport({
        id,
        serverOnly,
      }),
    }))
  )
)}`;

const publicApiOperationByCommand = new Map(
  publicApiOperations.map((operation) => [operation.command, operation])
);

export const getPublicApiOperation = (command: PublicApiCommand) => {
  const operation = publicApiOperationByCommand.get(command);
  if (operation === undefined) {
    throw new Error(`Unknown public API operation "${command}".`);
  }
  return operation;
};

export const getPublicApiOperationPath = (command: PublicApiCommand) => {
  const operation = getPublicApiOperation(command);
  const path = operation.path;
  if (path === undefined) {
    throw new Error(`Public API operation "${command}" has no tRPC path.`);
  }
  return path;
};
