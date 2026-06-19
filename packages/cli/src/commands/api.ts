import { spinner } from "@clack/prompts";
import {
  apiClientHeader,
  apiClientVersionHeader,
  getApiCompatibilityPayload,
} from "@webstudio-is/trpc-interface/api-compatibility";
import packageJson from "../../package.json";
import { syncDataVersion } from "@webstudio-is/api-contract";

export const apiCompatibilityHeaders = {
  [apiClientHeader]: "cli",
  [apiClientVersionHeader]: packageJson.version,
};

const updateCliCommand = "npm install -g webstudio@latest";

const getCliCompatibilityMessage = (error: unknown, command: string) => {
  const payload = getApiCompatibilityPayload(error);
  if (payload?.action.type !== "updateCli") {
    return;
  }

  return `${payload.message}

Update the CLI with:
  ${updateCliCommand}

Or run the latest version once with:
  npx webstudio@latest ${command}`;
};

export const stopSpinnerWithError = (
  indicator: ReturnType<typeof spinner>,
  error: unknown,
  fallbackMessage: string,
  command: string
) => {
  const compatibilityMessage = getCliCompatibilityMessage(error, command);
  const message = error instanceof Error ? error.message : fallbackMessage;
  indicator.stop(compatibilityMessage ?? message, 2);
  return compatibilityMessage;
};

export const getSyncDataVersionMismatchMessage = (
  version: number | string | undefined
) =>
  `Synced project data format is incompatible. Expected version ${syncDataVersion}, received ${version ?? "missing"}. Sync with a compatible API/CLI version and retry, or pass --ignore-version-check if you know the source and target data formats are compatible.`;
