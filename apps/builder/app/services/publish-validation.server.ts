import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { db as authDb } from "@webstudio-is/authorization-token/index.server";
import { loadById } from "@webstudio-is/project/index.server";
import type { CompactBuild } from "@webstudio-is/project-build";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import {
  formatBuildIntegrityError,
  getBuildIntegrityIssues,
} from "@webstudio-is/project-build/runtime";
import { parseGeneratedStyleDeclaration } from "@webstudio-is/project-build/persistence";
import {
  getDefaultPublishDomains,
  getVerifiedPublishDomains,
} from "@webstudio-is/domain/index.server";
import { loadAssetDataByProject } from "@webstudio-is/asset-uploader/server";
import { hasCssSyntaxError } from "@webstudio-is/css-data";
import { generateCss, getStyleDeclKey, type Asset } from "@webstudio-is/sdk";
import { componentMetas } from "~/shared/component-metas.server";
import { throwApiError } from "./api-errors.server";
import { loadContentDatabasePublishDiagnostics } from "./content-database-publish-diagnostics.server";

type PublishAuthorization =
  | { type: "user" }
  | { type: "token"; token: Awaited<ReturnType<typeof authDb.getTokenInfo>> };

export const publishValidationInput = z.object({
  projectId: z.string(),
  target: z.enum(["staging", "production"]),
  domains: z.array(z.string()).optional(),
});

export const assertPublishDomains = ({
  auth,
  domains,
  project,
}: {
  auth: PublishAuthorization;
  domains: string[];
  project: { domain: string };
}) => {
  if (auth.type === "user") {
    return;
  }
  const { token } = auth;
  if (token.canPublish === true) {
    return;
  }
  if (
    token.relation === "builders" &&
    domains.length > 0 &&
    domains.every((domain) => domain === project.domain)
  ) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Authorization token does not have publish permission",
  });
};

const canPublishBuildCss = async (build: CompactBuild, assets: Asset[]) => {
  const usedComponents = new Set(
    build.instances.map((instance) => instance.component)
  );
  const { cssText } = generateCss({
    assets: new Map(assets.map((asset) => [asset.id, asset])),
    instances: new Map(
      build.instances.map((instance) => [instance.id, instance])
    ),
    props: new Map(build.props.map((prop) => [prop.id, prop])),
    breakpoints: new Map(
      build.breakpoints.map((breakpoint) => [breakpoint.id, breakpoint])
    ),
    styles: new Map(
      build.styles
        .filter(
          (style) => parseGeneratedStyleDeclaration(style).errors.length === 0
        )
        .map((style) => [getStyleDeclKey(style), style])
    ),
    styleSources: new Map(
      build.styleSources.map((source) => [source.id, source])
    ),
    styleSourceSelections: new Map(
      build.styleSourceSelections.map((selection) => [
        selection.instanceId,
        selection,
      ])
    ),
    componentMetas: new Map(
      [...componentMetas].filter(([name]) => usedComponents.has(name))
    ),
    assetBaseUrl: "",
    atomic:
      build.projectSettings?.compiler?.atomicStyles ??
      build.pages?.compiler?.atomicStyles ??
      true,
  });
  return hasCssSyntaxError(cssText) === false;
};

export const validatePublish = async ({
  auth,
  ctx,
  input,
}: {
  auth: PublishAuthorization;
  ctx: AppContext;
  input: z.infer<typeof publishValidationInput>;
}) => {
  const project = await loadById(input.projectId, ctx);
  const domains =
    input.domains ?? getDefaultPublishDomains(project, input.target);
  assertPublishDomains({ auth, domains, project });
  if (domains.length === 0) {
    throwApiError("BAD_REQUEST", "Select at least one domain to publish.");
  }
  const verifiedDomains = getVerifiedPublishDomains(project, domains);
  const invalidDomains = domains.filter(
    (domain) => verifiedDomains.includes(domain) === false
  );
  if (invalidDomains.length > 0) {
    throwApiError(
      "BAD_REQUEST",
      `Publish domains must belong to this project and be active and verified: ${invalidDomains.join(", ")}`
    );
  }
  const build = await loadDevBuildByProjectId(ctx, input.projectId);
  const issues = getBuildIntegrityIssues(build);
  if (issues[0] !== undefined) {
    throwApiError(
      "BAD_REQUEST",
      formatBuildIntegrityError(issues[0], "Cannot publish"),
      { issues }
    );
  }
  const diagnostics = await loadContentDatabasePublishDiagnostics(
    input.projectId,
    ctx,
    { build }
  );
  const { assets } = await loadAssetDataByProject(input.projectId, ctx, {
    skipPermissionsCheck: true,
  });
  const cssValid = await canPublishBuildCss(build, assets);
  return {
    valid: true,
    target: input.target,
    domains,
    diagnostics,
    cssValid,
  };
};
