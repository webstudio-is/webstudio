import type { Deployment } from "../schema/deployment";

export const parseDeployment = (deployment: string | null) => {
  if (deployment === null) {
    return;
  }

  return JSON.parse(deployment) as Deployment;
};

export const serializeDeployment = (deployment: Deployment) => {
  return JSON.stringify(deployment);
};
