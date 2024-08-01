import type { Deployment } from "@webstudio-is/sdk";

export const parseDeployment = (deployment: string | null) => {
  if (deployment === null) {
    return;
  }

  return JSON.parse(deployment) as Deployment;
};
