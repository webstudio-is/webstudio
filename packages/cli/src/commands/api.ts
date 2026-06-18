import { spinner } from "@clack/prompts";
import {
  apiClientHeader,
  apiClientVersionHeader,
  getApiCompatibilityPayload,
} from "@webstudio-is/trpc-interface/api-compatibility";
import packageJson from "../../package.json";

export const apiCompatibilityHeaders = {
  [apiClientHeader]: "cli",
  [apiClientVersionHeader]: packageJson.version,
};

const updateCliCommand = "npm install -g webstudio@latest";

const getCliCompatibilityMessage = (error: unknown) => {
  const payload = getApiCompatibilityPayload(error);
  if (payload?.action.type !== "updateCli") {
    return;
  }

  return `${payload.message}

Update the CLI with:
  ${updateCliCommand}

Or run the latest version once with:
  npx webstudio@latest sync`;
};

export const stopSpinnerWithError = (
  indicator: ReturnType<typeof spinner>,
  error: unknown,
  fallbackMessage: string
) => {
  const compatibilityMessage = getCliCompatibilityMessage(error);
  const message = error instanceof Error ? error.message : fallbackMessage;
  indicator.stop(compatibilityMessage ?? message, 2);
  return compatibilityMessage;
};
