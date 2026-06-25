import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  AuthorizationError,
  authorizeProject,
  procedure,
  router,
  type AppContext,
  type AuthPermit,
} from "@webstudio-is/trpc-interface/index.server";
import { loadById } from "@webstudio-is/project/index.server";
import {
  loadDevBuildByProjectId,
  loadBuildById,
} from "@webstudio-is/project-build/index.server";
import { patchBuild } from "@webstudio-is/project/index.server";
import type { CompactBuild } from "@webstudio-is/project-build";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import { buildPatchTransaction } from "@webstudio-is/protocol";
import type { Asset } from "@webstudio-is/sdk";

type ApiPermit = AuthPermit | "api";

type ApiToken = Awaited<ReturnType<typeof authDb.getTokenInfo>>;

const relationPermits: Record<ApiToken["relation"], AuthPermit[]> = {
  viewers: ["view"],
  editors: ["view", "edit"],
  builders: ["view", "edit", "build"],
  administrators: ["view", "edit", "build", "admin"],
};

const loadBuildByProjectVersion = async (
  ctx: AppContext,
  projectId: string,
  version: number
) => {
  const build = await ctx.postgrest.client
    .from("Build")
    .select("id")
    .eq("projectId", projectId)
    .eq("version", version)
    .is("deployment", null)
    .order("createdAt", { ascending: false })
    .limit(1);

  if (build.error) {
    throw build.error;
  }
  const buildId = build.data.at(0)?.id;
  if (buildId === undefined) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Build version not found for project",
    });
  }

  return await loadBuildById(ctx, buildId);
};

const loadApiToken = async (ctx: AppContext) => {
  if (ctx.authorization.type !== "token") {
    throw new AuthorizationError("Builder API requires an API token");
  }

  return await authDb.getTokenInfo(ctx.authorization.authToken, ctx);
};

const getTokenPermits = (token: ApiToken, ctx: AppContext) => {
  const permits: ApiPermit[] = [...relationPermits[token.relation]];
  if (
    token.canUseApi === true &&
    ctx.planFeatures.allowAdditionalPermissions === true
  ) {
    permits.push("api");
  }
  return permits;
};

const assertApiTokenPermit = async (ctx: AppContext) => {
  const token = await loadApiToken(ctx);
  const permits = getTokenPermits(token, ctx);
  if (permits.includes("api") === false) {
    throw new AuthorizationError("Authorization token cannot use Builder API");
  }
  return { token, permits };
};

const assertApiProjectPermit = async (
  ctx: AppContext,
  projectId: string,
  permit: AuthPermit
) => {
  const { token, permits } = await assertApiTokenPermit(ctx);
  if (token.projectId !== projectId) {
    throw new AuthorizationError(
      "Authorization token is not valid for project"
    );
  }

  if (permits.includes(permit) === false) {
    throw new AuthorizationError(
      `Authorization token does not have ${permit} permission`
    );
  }

  const canUseProject = await authorizeProject.hasProjectPermit(
    { projectId, permit },
    ctx
  );
  if (canUseProject === false) {
    throw new AuthorizationError("You don't have access to this project");
  }

  return { token, permits };
};

const loadReadableDevBuild = async (ctx: AppContext, projectId: string) => {
  await assertApiProjectPermit(ctx, projectId, "view");
  return await loadDevBuildByProjectId(ctx, projectId);
};

const buildInclude = z.enum([
  "pages",
  "folders",
  "instances",
  "props",
  "styles",
  "styleSources",
  "styleSourceSelections",
  "designTokens",
  "assets",
  "resources",
  "variables",
  "breakpoints",
]);

type BuildInclude = z.infer<typeof buildInclude>;

const createBuildSnapshot = ({
  build,
  include,
  projectId,
}: {
  build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
  include: Set<BuildInclude>;
  projectId: string;
}) => {
  const snapshot: Record<string, unknown> = {
    projectId,
    buildId: build.id,
    version: build.version,
  };
  const add = (name: BuildInclude, value: unknown) => {
    if (include.has(name)) {
      snapshot[name] = value;
    }
  };

  if (include.has("pages") || include.has("folders")) {
    const pages = serializePages(build.pages);
    add("pages", pages.pages);
    add("folders", pages.folders);
  }
  add("instances", build.instances);
  add("props", build.props);
  add("styles", build.styles);
  add("styleSources", build.styleSources);
  add("styleSourceSelections", build.styleSourceSelections);
  if (include.has("designTokens")) {
    snapshot.designTokens = build.styleSources.filter(
      (styleSource) => styleSource.type === "token"
    );
  }
  add("resources", build.resources);
  add("variables", build.dataSources);
  add("breakpoints", build.breakpoints);

  return snapshot;
};

const serializeProjectSummary = (
  project: Awaited<ReturnType<typeof loadById>>
) => {
  if (project === null) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  return {
    id: project.id,
    name: project.title,
    domain: project.domain ?? undefined,
    createdAt: project.createdAt,
    updatedAt:
      project.latestBuildVirtual?.createdAt ??
      project.latestStaticBuild?.updatedAt ??
      project.createdAt,
  };
};

const getSerializedPages = (build: CompactBuild) => serializePages(build.pages);

const findParentFolderId = (
  folders: ReturnType<typeof getSerializedPages>["folders"],
  childId: string
) => folders.find((folder) => folder.children.includes(childId))?.id;

const serializePageSummary = (
  pages: ReturnType<typeof getSerializedPages>,
  page: ReturnType<typeof getSerializedPages>["pages"][number]
) => ({
  id: page.id,
  name: page.name,
  path: page.path,
  title: page.title,
  rootInstanceId: page.rootInstanceId,
  parentFolderId: findParentFolderId(pages.folders, page.id),
  isHome: page.id === pages.homePageId,
});

const serializePageDetails = (
  pages: ReturnType<typeof getSerializedPages>,
  page: ReturnType<typeof getSerializedPages>["pages"][number]
) => ({
  ...serializePageSummary(pages, page),
  meta: {
    description: page.meta.description,
    language: page.meta.language,
    redirect: page.meta.redirect,
    socialImageUrl: page.meta.socialImageUrl,
    socialImageAssetId: page.meta.socialImageAssetId,
    excludePageFromSearch:
      page.meta.excludePageFromSearch === undefined
        ? undefined
        : page.meta.excludePageFromSearch === "true",
    documentType: page.meta.documentType ?? "html",
    content: page.meta.content,
    custom: page.meta.custom,
  },
});

const getInstanceDepths = (build: CompactBuild, rootInstanceIds?: string[]) => {
  const instancesById = new Map(
    build.instances.map((instance) => [instance.id, instance])
  );
  const depths = new Map<string, number>();
  const visit = (instanceId: string, depth: number) => {
    if (depths.has(instanceId)) {
      return;
    }
    const instance = instancesById.get(instanceId);
    if (instance === undefined) {
      return;
    }
    depths.set(instanceId, depth);
    for (const child of instance.children) {
      if (child.type === "id") {
        visit(child.value, depth + 1);
      }
    }
  };

  const roots =
    rootInstanceIds ??
    Array.from(build.pages.pages.values()).map((page) => page.rootInstanceId);
  for (const root of roots) {
    visit(root, 0);
  }
  return depths;
};

const serializeInstanceSummary = (
  instance: CompactBuild["instances"][number],
  depth: number
) => ({
  id: instance.id,
  label: instance.label,
  component: instance.component,
  tag: instance.tag,
  depth,
  childCount: instance.children.length,
});

const getPageByInput = (
  pages: ReturnType<typeof getSerializedPages>,
  input: { pageId?: string; pagePath?: string }
) => {
  if (input.pageId !== undefined) {
    return pages.pages.find((page) => page.id === input.pageId);
  }
  if (input.pagePath !== undefined) {
    return pages.pages.find((page) => page.path === input.pagePath);
  }
};

const getRequiredPageByInput = (
  pages: ReturnType<typeof getSerializedPages>,
  input: { pageId?: string; pagePath?: string }
) => {
  if (input.pageId === undefined && input.pagePath === undefined) {
    return undefined;
  }
  const page = getPageByInput(pages, input);
  if (page === undefined) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
  }
  return page;
};

const serializeRequiredPageDetails = (
  build: CompactBuild,
  input: { pageId?: string; pagePath?: string }
) => {
  const pages = getSerializedPages(build);
  const page = getRequiredPageByInput(pages, input);
  if (page === undefined) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
  }
  return serializePageDetails(pages, page);
};

const serializeTextNodes = (
  build: CompactBuild,
  input: {
    pageId?: string;
    pagePath?: string;
    instanceId?: string;
    mode?: "text" | "expression" | "all";
    contains?: string;
    maxValueLength?: number;
  }
) => {
  const pages = getSerializedPages(build);
  const page = getRequiredPageByInput(pages, input);
  const rootIds =
    page === undefined
      ? undefined
      : Array.from(getInstanceDepths(build, [page.rootInstanceId]).keys());
  const rootIdSet = rootIds === undefined ? undefined : new Set(rootIds);
  const mode = input.mode ?? "all";
  const texts = [];

  for (const instance of build.instances) {
    if (input.instanceId !== undefined && instance.id !== input.instanceId) {
      continue;
    }
    if (rootIdSet !== undefined && rootIdSet.has(instance.id) === false) {
      continue;
    }
    for (const [childIndex, child] of instance.children.entries()) {
      if (child.type !== "text" && child.type !== "expression") {
        continue;
      }
      if (mode !== "all" && child.type !== mode) {
        continue;
      }
      if (
        input.contains !== undefined &&
        child.value.includes(input.contains) === false
      ) {
        continue;
      }
      const value =
        input.maxValueLength === undefined
          ? child.value
          : child.value.slice(0, input.maxValueLength);
      texts.push({
        instanceId: instance.id,
        childIndex,
        component: instance.component,
        label: instance.label,
        mode: child.type,
        value,
      });
    }
  }

  return texts;
};

const serializeStyleDeclarations = (
  build: CompactBuild,
  input: {
    instanceIds?: string[];
    pageId?: string;
    pagePath?: string;
    breakpoint?: string;
    state?: string;
    property?: string;
    propertyFilter?: string;
    includeTokens?: boolean;
  }
) => {
  const pages = getSerializedPages(build);
  const page = getRequiredPageByInput(pages, input);
  const pageInstanceIds =
    page === undefined
      ? undefined
      : new Set(getInstanceDepths(build, [page.rootInstanceId]).keys());
  const instanceIds =
    input.instanceIds === undefined ? undefined : new Set(input.instanceIds);
  const sourceById = new Map(
    build.styleSources.map((styleSource) => [styleSource.id, styleSource])
  );
  const selectionsBySource = new Map<string, string[]>();
  for (const selection of build.styleSourceSelections) {
    for (const styleSourceId of selection.values) {
      const list = selectionsBySource.get(styleSourceId) ?? [];
      list.push(selection.instanceId);
      selectionsBySource.set(styleSourceId, list);
    }
  }

  const declarations = [];
  for (const styleDecl of build.styles) {
    if (
      input.breakpoint !== undefined &&
      styleDecl.breakpointId !== input.breakpoint
    ) {
      continue;
    }
    if (input.state !== undefined && styleDecl.state !== input.state) {
      continue;
    }
    if (input.property !== undefined && styleDecl.property !== input.property) {
      continue;
    }
    if (
      input.propertyFilter !== undefined &&
      styleDecl.property.includes(input.propertyFilter) === false
    ) {
      continue;
    }

    const source = sourceById.get(styleDecl.styleSourceId);
    if (source?.type === "token" && input.includeTokens !== true) {
      continue;
    }
    const sourceInstanceIds = selectionsBySource.get(styleDecl.styleSourceId);
    for (const instanceId of sourceInstanceIds ?? []) {
      if (instanceIds !== undefined && instanceIds.has(instanceId) === false) {
        continue;
      }
      if (
        pageInstanceIds !== undefined &&
        pageInstanceIds.has(instanceId) === false
      ) {
        continue;
      }
      declarations.push({
        instanceId,
        styleSourceId: styleDecl.styleSourceId,
        property: styleDecl.property,
        value: styleDecl.value,
        breakpoint: styleDecl.breakpointId,
        state: styleDecl.state,
        source: source?.type ?? "local",
      });
    }
  }
  return declarations;
};

const serializeAssetSummary = (asset: Asset) => ({
  id: asset.id,
  name: asset.name,
  type: asset.type,
  size: asset.size,
  contentType: asset.format,
  createdAt: asset.createdAt,
});

const serializeDesignTokens = (
  build: CompactBuild,
  input: {
    withUsage?: boolean;
    filter?: string;
    sort?: "name" | "usage";
  }
) => {
  const shouldCountUsage = input.withUsage === true || input.sort === "usage";
  const tokens = build.styleSources
    .filter((styleSource) => styleSource.type === "token")
    .filter(
      (styleSource) =>
        input.filter === undefined || styleSource.name.includes(input.filter)
    )
    .map((styleSource) => {
      const styles = Object.fromEntries(
        build.styles
          .filter((style) => style.styleSourceId === styleSource.id)
          .map((style) => [style.property, style.value])
      );
      const usageCount = build.styleSourceSelections.filter((selection) =>
        selection.values.includes(styleSource.id)
      ).length;
      return {
        id: styleSource.id,
        name: styleSource.name,
        styles,
        usageCount: shouldCountUsage ? usageCount : undefined,
      };
    });
  tokens.sort((left, right) =>
    input.sort === "usage"
      ? (right.usageCount ?? 0) - (left.usageCount ?? 0)
      : left.name.localeCompare(right.name)
  );
  return { tokens };
};

const countStringReferences = (value: unknown, target: string): number => {
  if (value === target) {
    return 1;
  }
  if (Array.isArray(value)) {
    return value.reduce(
      (count, item) => count + countStringReferences(item, target),
      0
    );
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).reduce(
      (count, item) => count + countStringReferences(item, target),
      0
    );
  }
  return 0;
};

const countAssetUsage = (build: CompactBuild, assetId: string) =>
  countStringReferences(build.pages, assetId) +
  countStringReferences(build.props, assetId) +
  countStringReferences(build.styles, assetId) +
  countStringReferences(build.resources, assetId) +
  countStringReferences(build.dataSources, assetId);

const serializeAssetList = ({
  assets,
  build,
  input,
}: {
  assets: Asset[];
  build?: CompactBuild;
  input: {
    type?: "image" | "font";
    withUsage?: boolean;
    sort?: "name" | "size" | "createdAt" | "usage";
    cursor?: string;
    limit?: number;
  };
}) => {
  const shouldCountUsage = input.withUsage === true || input.sort === "usage";
  const sorted = assets
    .filter((asset) => input.type === undefined || asset.type === input.type)
    .map((asset) => ({
      ...serializeAssetSummary(asset),
      usageCount:
        shouldCountUsage && build !== undefined
          ? countAssetUsage(build, asset.id)
          : undefined,
    }));
  sorted.sort((left, right) => {
    switch (input.sort) {
      case "size":
        return right.size - left.size;
      case "createdAt":
        return right.createdAt.localeCompare(left.createdAt);
      case "usage":
        return (right.usageCount ?? 0) - (left.usageCount ?? 0);
      case "name":
      default:
        return left.name.localeCompare(right.name);
    }
  });
  const start = input.cursor === undefined ? 0 : Number(input.cursor);
  if (Number.isInteger(start) === false || start < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid asset cursor",
    });
  }
  const limit = input.limit ?? sorted.length;
  const items = sorted.slice(start, start + limit);
  const nextIndex = start + items.length;
  return {
    items,
    nextCursor: nextIndex < sorted.length ? String(nextIndex) : null,
  };
};

export const apiRouter = router({
  auth: router({
    me: procedure.query(async ({ ctx }) => {
      const { token, permits } = await assertApiTokenPermit(ctx);
      return {
        actor: { type: "token" as const, tokenId: token.token },
        projectId: token.projectId,
        relation: token.relation,
        permits,
      };
    }),
  }),

  projects: router({
    permissions: procedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        const { token, permits } = await assertApiProjectPermit(
          ctx,
          input.projectId,
          "view"
        );
        return {
          relation: token.relation,
          permits,
          canView: permits.includes("view"),
          canEdit: permits.includes("edit"),
          canBuild: permits.includes("build"),
          canAdmin: permits.includes("admin"),
          canOwn: false,
          canUseApi: permits.includes("api"),
        };
      }),

    get: procedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        await assertApiProjectPermit(ctx, input.projectId, "view");
        const project = await loadById(input.projectId, ctx);
        const build = await loadDevBuildByProjectId(ctx, input.projectId);
        return {
          ...serializeProjectSummary(project),
          buildId: build.id,
          version: build.version,
          homePageId: build.pages.homePageId,
          features: ctx.planFeatures,
        };
      }),
  }),

  build: router({
    get: procedure
      .input(
        z.object({
          projectId: z.string(),
          include: z.array(buildInclude).optional(),
          version: z.number().int().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        await assertApiProjectPermit(ctx, input.projectId, "view");

        const build =
          input.version === undefined
            ? await loadDevBuildByProjectId(ctx, input.projectId)
            : await loadBuildByProjectVersion(
                ctx,
                input.projectId,
                input.version
              );

        if (build.projectId !== input.projectId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Build not found for project",
          });
        }

        const include = new Set(input.include ?? []);
        const snapshot = createBuildSnapshot({
          build,
          include,
          projectId: input.projectId,
        });
        if (include.has("assets")) {
          snapshot.assets = await loadAssetsByProject(input.projectId, ctx);
        }

        return snapshot;
      }),

    patch: procedure
      .input(
        z.object({
          projectId: z.string(),
          baseVersion: z.number().int(),
          transactions: z.array(buildPatchTransaction).min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertApiProjectPermit(ctx, input.projectId, "build");
        const build = await loadDevBuildByProjectId(ctx, input.projectId);
        const result = await patchBuild(
          {
            buildId: build.id,
            projectId: input.projectId,
            clientVersion: input.baseVersion,
            transactions: input.transactions,
          },
          ctx
        );

        if (result.status === "version_mismatched") {
          throw new TRPCError({
            code: "CONFLICT",
            message: result.errors,
          });
        }
        if (result.status === "error") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.errors,
          });
        }

        return { version: result.version };
      }),
  }),

  pages: router({
    list: procedure
      .input(
        z.object({
          projectId: z.string(),
          includeFolders: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        const pages = getSerializedPages(build);
        const folders =
          input.includeFolders === true ? pages.folders : undefined;
        return {
          pages: pages.pages.map((page) => serializePageSummary(pages, page)),
          folders,
        };
      }),

    get: procedure
      .input(z.object({ projectId: z.string(), pageId: z.string() }))
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        return serializeRequiredPageDetails(build, { pageId: input.pageId });
      }),

    getByPath: procedure
      .input(z.object({ projectId: z.string(), path: z.string() }))
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        return serializeRequiredPageDetails(build, { pagePath: input.path });
      }),
  }),

  folders: router({
    list: procedure
      .input(
        z.object({
          projectId: z.string(),
          includePages: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        const pages = getSerializedPages(build);
        const pageSummaries =
          input.includePages === true
            ? pages.pages.map((page) => serializePageSummary(pages, page))
            : undefined;
        return {
          folders: pages.folders.map((folder) => ({
            id: folder.id,
            name: folder.name,
            slug: folder.slug,
            parentFolderId: findParentFolderId(pages.folders, folder.id),
            children: folder.children,
          })),
          pages: pageSummaries,
        };
      }),
  }),

  instances: router({
    list: procedure
      .input(
        z.object({
          projectId: z.string(),
          pageId: z.string().optional(),
          pagePath: z.string().optional(),
          rootInstanceId: z.string().optional(),
          maxDepth: z.number().int().optional(),
          topLevelOnly: z.boolean().optional(),
          component: z.string().optional(),
          tag: z.string().optional(),
          labelContains: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        const pages = getSerializedPages(build);
        const page = getRequiredPageByInput(pages, input);
        const rootInstanceIds =
          input.rootInstanceId !== undefined
            ? [input.rootInstanceId]
            : page === undefined
              ? undefined
              : [page.rootInstanceId];
        const depths = getInstanceDepths(build, rootInstanceIds);
        const instances = [];

        for (const instance of build.instances) {
          const depth = depths.get(instance.id);
          if (depth === undefined) {
            continue;
          }
          if (input.maxDepth !== undefined && depth > input.maxDepth) {
            continue;
          }
          if (input.topLevelOnly === true && depth > 0) {
            continue;
          }
          if (
            input.component !== undefined &&
            instance.component !== input.component
          ) {
            continue;
          }
          if (input.tag !== undefined && instance.tag !== input.tag) {
            continue;
          }
          if (
            input.labelContains !== undefined &&
            instance.label?.includes(input.labelContains) !== true
          ) {
            continue;
          }
          instances.push(serializeInstanceSummary(instance, depth));
        }

        return { instances };
      }),

    inspect: procedure
      .input(
        z.object({
          projectId: z.string(),
          instanceId: z.string(),
          include: z
            .array(
              z.enum(["props", "styles", "children", "bindings", "sources"])
            )
            .optional(),
          childDepth: z.number().int().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        const depths = getInstanceDepths(build, [input.instanceId]);
        const instance = build.instances.find(
          (instance) => instance.id === input.instanceId
        );
        if (instance === undefined) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Instance not found",
          });
        }

        const include = new Set(input.include ?? []);
        const details: Record<string, unknown> = serializeInstanceSummary(
          instance,
          depths.get(instance.id) ?? 0
        );
        if (include.has("props")) {
          details.props = build.props.filter(
            (prop) => prop.instanceId === instance.id
          );
        }
        if (include.has("styles")) {
          details.styles = serializeStyleDeclarations(build, {
            instanceIds: [instance.id],
          });
        }
        if (include.has("children")) {
          const maxDepth = input.childDepth ?? 1;
          details.children = build.instances
            .filter((child) => {
              const depth = depths.get(child.id);
              return depth !== undefined && depth > 0 && depth <= maxDepth;
            })
            .map((child) =>
              serializeInstanceSummary(child, depths.get(child.id) ?? 0)
            );
        }
        if (include.has("bindings")) {
          details.bindings = build.props.filter(
            (prop) =>
              prop.instanceId === instance.id &&
              (prop.type === "expression" ||
                prop.type === "parameter" ||
                prop.type === "resource" ||
                prop.type === "action")
          );
        }
        if (include.has("sources")) {
          const selected = build.styleSourceSelections.find(
            (selection) => selection.instanceId === instance.id
          );
          details.sources = selected?.values ?? [];
        }
        return details;
      }),
  }),

  texts: router({
    list: procedure
      .input(
        z.object({
          projectId: z.string(),
          pageId: z.string().optional(),
          pagePath: z.string().optional(),
          instanceId: z.string().optional(),
          mode: z.enum(["text", "expression", "all"]).optional(),
          contains: z.string().optional(),
          maxValueLength: z.number().int().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        return { texts: serializeTextNodes(build, input) };
      }),
  }),

  styles: router({
    getDeclarations: procedure
      .input(
        z.object({
          projectId: z.string(),
          instanceIds: z.array(z.string()).optional(),
          pageId: z.string().optional(),
          pagePath: z.string().optional(),
          breakpoint: z.string().optional(),
          state: z.string().optional(),
          property: z.string().optional(),
          propertyFilter: z.string().optional(),
          includeTokens: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        return { declarations: serializeStyleDeclarations(build, input) };
      }),
  }),

  designTokens: router({
    list: procedure
      .input(
        z.object({
          projectId: z.string(),
          withUsage: z.boolean().optional(),
          filter: z.string().optional(),
          sort: z.enum(["name", "usage"]).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        return serializeDesignTokens(build, input);
      }),
  }),

  variables: router({
    list: procedure
      .input(
        z.object({
          projectId: z.string(),
          scopeInstanceId: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        return {
          variables: build.dataSources
            .filter((dataSource) => dataSource.type === "variable")
            .filter(
              (dataSource) =>
                input.scopeInstanceId === undefined ||
                dataSource.scopeInstanceId === input.scopeInstanceId
            )
            .map((dataSource) => ({
              id: dataSource.id,
              name: dataSource.name,
              scopeInstanceId: dataSource.scopeInstanceId,
              value: dataSource.value,
            })),
        };
      }),
  }),

  resources: router({
    list: procedure
      .input(
        z.object({
          projectId: z.string(),
          scopeInstanceId: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const build = await loadReadableDevBuild(ctx, input.projectId);
        return {
          resources: build.resources
            .filter(
              (resource) =>
                input.scopeInstanceId === undefined ||
                build.dataSources.some(
                  (dataSource) =>
                    dataSource.type === "resource" &&
                    dataSource.resourceId === resource.id &&
                    dataSource.scopeInstanceId === input.scopeInstanceId
                )
            )
            .map((resource) => {
              const dataSource = build.dataSources.find(
                (dataSource) =>
                  dataSource.type === "resource" &&
                  dataSource.resourceId === resource.id
              );
              return {
                id: resource.id,
                name: resource.name,
                method: resource.method,
                url: resource.url,
                scopeInstanceId: dataSource?.scopeInstanceId,
                exposedAsDataSource: dataSource !== undefined,
                dataSourceId: dataSource?.id,
              };
            }),
        };
      }),
  }),

  assets: router({
    list: procedure
      .input(
        z.object({
          projectId: z.string(),
          type: z.enum(["image", "font"]).optional(),
          withUsage: z.boolean().optional(),
          sort: z.enum(["name", "size", "createdAt", "usage"]).optional(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        await assertApiProjectPermit(ctx, input.projectId, "view");
        const assets = await loadAssetsByProject(input.projectId, ctx, {
          skipPermissionsCheck: true,
        });
        const build =
          input.withUsage === true || input.sort === "usage"
            ? await loadDevBuildByProjectId(ctx, input.projectId)
            : undefined;
        return serializeAssetList({ assets, build, input });
      }),
  }),
});

export const __testing__ = {
  assertApiTokenPermit,
  assertApiProjectPermit,
  createBuildSnapshot,
  getTokenPermits,
  serializeProjectSummary,
  serializeAssetList,
  serializeDesignTokens,
  serializeStyleDeclarations,
  serializeTextNodes,
};
