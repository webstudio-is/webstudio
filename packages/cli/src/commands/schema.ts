import { buildPatchNamespaces } from "@webstudio-is/protocol";
import { HandledCliError } from "../errors";
import { useCaseScenarios } from "./api-command-docs";
import { apiCommandMetadata } from "./api-command-metadata";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const schemaOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("topic", {
      type: "string",
      describe: "Schema topic to print",
      default: "api",
    })
    .option("json", {
      type: "boolean",
      describe: "Required. Print a machine-readable JSON schema to stdout",
      default: false,
    });

type SchemaOptions = StrictYargsOptionsToInterface<typeof schemaOptions> & {
  topic?: string;
};

const printJson = (value: unknown) => {
  console.info(JSON.stringify(value, undefined, 2));
};

const apiSchema = {
  name: "webstudio-api-cli",
  version: 1,
  projectScope:
    "All API commands operate on the single project configured by webstudio init --link.",
  requiredOutputMode:
    "Use --json. Successful responses are { ok: true, data, meta }. Failures are { ok: false, error, meta }.",
  commands: apiCommandMetadata.map((command) => ({
    name: command.command,
    summary: command.description,
    method: command.method,
    permit: command.permit,
    requiredOptions: command.requiredOptions ?? ["json"],
    examples: command.examples ?? [],
  })),
  session: {
    stateFile: ".webstudio/project-session.json",
    refreshFlag:
      "Use --refresh to refresh required namespaces before local-capable commands.",
    localReads:
      "Local-capable read commands use compatible cached namespaces and fetch only missing or stale namespaces.",
    localMutations:
      "Local-capable mutation commands build patches locally, commit with the cached build version, and update local state only after the remote commit succeeds.",
    serverOnly:
      "Server-only commands run remotely and invalidate/refetch namespaces declared by the public operation catalog.",
    resultMetadata:
      "Successful command JSON includes meta.session with operationId, buildId, version, source, committed, compatibility, namespace metadata, and diagnostics.",
  },
  useCases: useCaseScenarios,
  patch: {
    validationCommand:
      "webstudio validate-patch --base-version <version> --input patch.json --json",
    writeCommand:
      "webstudio apply-patch --base-version <version> --input patch.json --json",
    transactionInput:
      "Either BuildPatchTransaction[] or { transactions: BuildPatchTransaction[] }",
    namespaces: buildPatchNamespaces,
    operations: ["add", "remove", "replace"],
    rules: [
      "Run webstudio inspect --json before writing and use the returned latest build version as --base-version.",
      "Use semantic read commands first, then snapshot for exact patch paths.",
      "Regenerate patches after a VERSION_CONFLICT failure.",
    ],
  },
};

export const schema = (options: SchemaOptions) => {
  try {
    if (options.json !== true) {
      throw new Error("schema currently requires --json.");
    }
    if ((options.topic ?? "api") !== "api") {
      throw new Error(
        `Unknown schema topic "${options.topic}". Available topics: api`
      );
    }
    printJson(apiSchema);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    throw new HandledCliError();
  }
};
