import { Deployment } from "../schema/deployment";

export const parseDeployment = (
  deployment: string | null,
  skipValidation = false
) => {
  if (deployment === null) {
    return;
  }

  return skipValidation
    ? (JSON.parse(deployment) as Deployment)
    : Deployment.parse(JSON.parse(deployment));
};

export const serializeDeployment = (deployment: Deployment) => {
  return JSON.stringify(deployment);
};
