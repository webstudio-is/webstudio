import { z } from "zod";

export const templates = z.enum([
  "docker",
  "vercel",
  "netlify",
  "ssg",
  "ssg-netlify",
  "ssg-vercel",
]);

export type Templates = z.infer<typeof templates>;

export const deployment = z.union([
  z.object({
    destination: z.literal("static"),
    name: z.string(),
    assetsDomain: z.string(),
    // Must be validated very strictly
    templates: z.array(templates),
  }),
  z.object({
    destination: z.literal("saas").optional(),
    target: z.enum(["staging", "production"]).optional(),
    domains: z.array(z.string()),
    assetsDomain: z.string().optional(),
    /**
     * @deprecated This field is deprecated, use `domains` instead.
     */
    projectDomain: z.string().optional(),
    excludeWstdDomainFromSearch: z.boolean().optional(),
  }),
]);

export type Deployment = z.infer<typeof deployment>;

export type PublishTarget = "staging" | "production";
export type PublishedDeployment = Exclude<
  Deployment,
  { destination: "static" }
>;

const assetOriginByTarget: Record<PublishTarget, string> = {
  staging: "https://assets-dev.webstudio.is",
  production: "https://assets.webstudio.is",
};

export const getAssetOrigin = (target: PublishTarget) =>
  assetOriginByTarget[target];

/**
 * Resolves the publish target for hosted deployments, including deployments
 * written before the explicit target field was introduced.
 */
export const getPublishTarget = (
  deployment: PublishedDeployment
): PublishTarget => {
  if (deployment.target !== undefined) {
    return deployment.target;
  }
  const stagingDomain = deployment.assetsDomain ?? deployment.projectDomain;
  if (stagingDomain !== undefined) {
    return deployment.domains.some((domain) => domain !== stagingDomain)
      ? "production"
      : "staging";
  }
  return deployment.domains.length > 1 ? "production" : "staging";
};
