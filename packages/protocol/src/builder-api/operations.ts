import { serverOnlyRouterOperationMetadata } from "./__generated__/server-only-router-operation-metadata";
import { localOnlyOperationInputs } from "./local-operation-inputs";
import { publicApiOperationDocumentation } from "./operation-docs";
import {
  publicRuntimeOperationContracts,
  type PublicApiOperationNamespace,
  type PublicApiOperationPermit,
  type PublicRuntimeOperationId,
} from "./runtime-contracts";
export type {
  PublicApiOperationNamespace,
  PublicApiOperationPermit,
} from "./runtime-contracts";

export type PublicApiOperationMethod = "query" | "mutation";

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
  inputFields?: readonly string[];
  requiredInputFields?: readonly string[];
  inputFieldTypes?: Partial<Record<string, "array">>;
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
  requiredOptions?: readonly string[];
  examples: readonly string[];
  localCapable: boolean;
  serverOnly: boolean;
  runtimeOperationId?: PublicRuntimeOperationId;
  readNamespaces: readonly PublicApiOperationNamespace[];
  writeNamespaces: readonly PublicApiOperationNamespace[];
  invalidatesNamespaces: readonly PublicApiOperationNamespace[];
  retryOnConflict: boolean;
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

const isRuntimeOperationId = (id: string): id is PublicRuntimeOperationId =>
  runtimeOperationById.has(id as PublicRuntimeOperationId);

const withDefaultPermit = <Operation extends PublicApiOperationInput>(
  operation: Operation
): PublicApiOperation<Operation["command"]> => {
  const documentation = documentationByCommand.get(operation.command);
  if (documentation === undefined) {
    throw new Error(
      `Missing public API operation documentation for "${operation.command}".`
    );
  }
  const runtimeOperationId = isRuntimeOperationId(operation.id)
    ? operation.id
    : undefined;
  const runtimeOperation =
    runtimeOperationId === undefined
      ? undefined
      : runtimeOperationById.get(runtimeOperationId);
  return {
    ...operation,
    permit:
      operation.permit ?? (operation.method === "query" ? "view" : "build"),
    description: documentation.description,
    inputFields: operation.inputFields ?? runtimeOperation?.inputFields ?? [],
    requiredInputFields:
      operation.requiredInputFields ??
      runtimeOperation?.requiredInputFields ??
      [],
    inputFieldTypes:
      operation.inputFieldTypes ?? runtimeOperation?.inputFieldTypes ?? {},
    requiredOptions:
      "requiredOptions" in documentation
        ? documentation.requiredOptions
        : undefined,
    examples: documentation.examples,
    localCapable: runtimeOperation !== undefined,
    serverOnly: runtimeOperation === undefined,
    runtimeOperationId,
    readNamespaces: runtimeOperation?.readNamespaces ?? [],
    writeNamespaces: runtimeOperation?.writeNamespaces ?? [],
    invalidatesNamespaces:
      runtimeOperation?.invalidatesNamespaces ??
      operation.invalidatesNamespaces ??
      [],
    retryOnConflict: runtimeOperation?.retryOnConflict ?? false,
  };
};

const serverOnlyOperationInputs = [
  ...Object.values(serverOnlyRouterOperationMetadata),
  ...localOnlyOperationInputs,
] satisfies readonly PublicApiOperationInput[];

const serverOnlyOperationInputByCommand: Map<string, PublicApiOperationInput> =
  new Map(
    serverOnlyOperationInputs.map((operation) => [operation.command, operation])
  );
const runtimeOperationInputByCommand: Map<string, PublicApiOperationInput> =
  new Map(
    publicRuntimeOperationContracts.map((operation) => {
      const input = {
        command: operation.command,
        id: operation.id,
        method:
          operation.kind === "read"
            ? ("query" as const)
            : ("mutation" as const),
        path: "api." + operation.id,
        client: operation.client,
        permit: operation.permit,
      } satisfies PublicApiOperationInput;
      return [operation.command, input];
    })
  );

const getOperationInputByCommand = <Command extends PublicApiCommand>(
  command: Command
): PublicApiOperationInput<Command> => {
  const operation =
    serverOnlyOperationInputByCommand.get(command) ??
    runtimeOperationInputByCommand.get(command);
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
  const path = "path" in operation ? operation.path : undefined;
  if (path === undefined) {
    throw new Error(`Public API operation "${command}" has no tRPC path.`);
  }
  return path;
};
