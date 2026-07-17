import { spinner } from "@clack/prompts";
import {
  createApiClientHeaders,
  getApiCompatibilityMessage,
} from "@webstudio-is/http-client";
import packageJson from "../../package.json";

export const apiCompatibilityHeaders = createApiClientHeaders({
  name: "cli",
  version: packageJson.version,
});

const updateCliCommand = "npm install -g webstudio@latest";

export const getCliCompatibilityMessage = (error: unknown, command: string) => {
  return getApiCompatibilityMessage(error, {
    updateCommand: updateCliCommand,
    runLatestCommand: `npx webstudio@latest ${command}`,
  });
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
