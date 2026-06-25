import { readFile } from "node:fs/promises";
import { HandledCliError } from "../errors";
import {
  getPatchSummary,
  parsePatchTransactions,
  type BuildPatchTransaction,
} from "./patch-utils";
import type { CommonYargsArgv } from "./yargs-types";

type ValidatePatchDependencies = {
  readFile: typeof readFile;
};

const defaultDependencies: ValidatePatchDependencies = {
  readFile,
};

export const validatePatchOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("base-version", {
      type: "number",
      describe:
        "Required. Expected current build version used for the patch workflow",
      demandOption: true,
    })
    .option("input", {
      type: "string",
      describe:
        "Required. JSON file containing BuildPatchTransaction[] or { transactions }",
      demandOption: true,
    })
    .option("json", {
      type: "boolean",
      describe: "Required. Print a machine-readable JSON response to stdout",
      default: false,
    })
    .example(
      "$0 validate-patch --base-version 42 --input patch.json --json",
      "Validate patch JSON locally before apply-patch"
    );

type ValidatePatchOptions = {
  baseVersion?: number;
  "base-version"?: number;
  input?: string;
  json?: boolean;
};

const printJson = (value: unknown) => {
  console.log(JSON.stringify(value, undefined, 2));
};

const readTransactions = async (
  options: ValidatePatchOptions,
  dependencies: ValidatePatchDependencies
) => {
  if (options.input === undefined || options.input.length === 0) {
    throw new Error("--input is required.");
  }
  const input = JSON.parse(await dependencies.readFile(options.input, "utf-8"));
  return parsePatchTransactions(input);
};

const printSuccess = (
  baseVersion: number,
  transactions: BuildPatchTransaction[]
) => {
  printJson({
    ok: true,
    data: {
      valid: true,
      baseVersion,
      ...getPatchSummary(transactions),
    },
    meta: {
      command: "validate-patch",
    },
  });
};

const getErrorCode = (error: unknown) => {
  if (error instanceof SyntaxError) {
    return "INVALID_JSON";
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Invalid patch JSON")
    ? "INVALID_PATCH"
    : "INVALID_ARGUMENT";
};

export const validatePatch = async (
  options: ValidatePatchOptions,
  dependencies = defaultDependencies
) => {
  try {
    if (options.json !== true) {
      throw new Error("validate-patch currently requires --json.");
    }
    const baseVersion = options.baseVersion ?? options["base-version"];
    if (baseVersion === undefined) {
      throw new Error("--base-version is required.");
    }
    printSuccess(baseVersion, await readTransactions(options, dependencies));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json === true) {
      printJson({
        ok: false,
        error: {
          code: getErrorCode(error),
          message,
        },
        meta: {
          command: "validate-patch",
        },
      });
    } else {
      console.error(message);
    }
    throw new HandledCliError();
  }
};
