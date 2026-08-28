import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  sep,
} from "node:path";
import { existsSync } from "node:fs";
import { rm, cp, readFile, writeFile, readdir } from "node:fs/promises";
import { cwd, exit } from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";
import { log, spinner } from "@clack/prompts";
import merge from "deepmerge";
import deepEqual from "fast-deep-equal";
import {
  generateWebstudioComponent,
  type PublishedContentBlock,
  type Params,
  normalizeProps,
  generateRemixRoute,
  generateRemixParams,
  findTreeInstanceIdsExcludingStaticHidden,
} from "@webstudio-is/react-sdk";
import {
  createScope,
  getAllPages,
  isAssetsResource,
  getPagePath,
  getPublishablePages,
  generateResources,
  generatePageMeta,
  getStaticSiteMapXml,
  replaceFormActionsWithResources,
  isCoreComponent,
  coreMetas,
  decodeDataSourceVariable,
  findTreeInstanceIdsExcludingBlockTemplates,
  SYSTEM_VARIABLE_ID,
  generateCss,
  ROOT_INSTANCE_ID,
  elementComponent,
  toAssetReferenceRuntimeData,
  matchPathnameParams,
  blockComponent,
  findContentBlockBodyContainers,
  parseStructuredAssetQueryResourceBody,
  type StructuredAssetQueryFilterBinding,
  type StructuredAssetQueryWhereBinding,
  type Instance,
  type Prop,
  type Page,
  type DataSource,
  type Deployment,
  type Asset,
  type Resource,
  type WsComponentMeta,
  type Pages,
  type ComponentBuildContribution,
} from "@webstudio-is/sdk";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  collectFontFamiliesFromStyleDecls,
  createWebstudioDataFromFragment,
  createPublishedMdxMaterializationCache,
  getUnsafeDynamicPublishedMdxDiagnostic,
  materializePublishedMdx,
  getZodValidationIssues,
} from "@webstudio-is/project-build/runtime";
import {
  createPublishedBuildContentCompilationPlan,
  getDynamicPublishedMdxSourceBlockIds,
  hasDynamicPublishedMdxSources,
  resolvePublishedMdxAssetCandidates,
} from "@webstudio-is/project-build";
import {
  assetQueryFilter,
  type AssetRuntimeData,
  type AssetQueryFilter,
  type ContentArtifactV1,
  type ContentRuntimeArtifact,
  type ContentDatabaseDocument,
  createContentRuntimeArtifact,
  getAssetQueryFieldValue,
  getContentArtifactReferencedAssetIds,
  getContentRuntimeArtifactRuntimeAssetIds,
  matchesAssetQueryFilter,
  requiresRuntimeDocumentData,
  serializeContentRuntimeArtifact,
  verifyContentArtifact,
} from "@webstudio-is/content-engine";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  parseJsonExpression,
  parseStaticMemberPath,
} from "@webstudio-is/expression";
import {
  evaluateQueryWhere,
  getQueryConditions,
} from "@webstudio-is/query-builder/runtime";
import {
  bundleVersion,
  publishedProjectBundle,
  type PublishedProjectBundle,
} from "@webstudio-is/protocol";
import { createAuthConfigResources, LOCAL_AUTH_FILE } from "./auth-config";
import { LOCAL_DATA_FILE } from "./config";
import {
  createFileIfNotExists,
  createFolderIfNotExists,
  loadJSONFile,
  writeFileIfChanged,
} from "./fs-utils";
import { htmlToJsx } from "./html-to-jsx";
import { compareMedia } from "@webstudio-is/css-engine";
import { LOCAL_ASSETS_DIR, materializeAssetFiles } from "./asset-files";
import { formatZodIssues } from "./zod-utils";
import { createFramework as createRemixFramework } from "./framework-remix";
import { createFramework as createReactRouterFramework } from "./framework-react-router";
import { createFramework as createVikeSsgFramework } from "./framework-vike-ssg";
import { routeTemplatesDirectory } from "./framework";
import { readSsgAssetResourceFetchTemplate } from "./ssg-asset-resource-fetch-template";

export const generatedFilesManifest = join(
  ".webstudio",
  "generated-files.json"
);
const contentRuntimeBundleUrl = new URL(
  /* @vite-ignore */ "../lib/content-runtime.js",
  import.meta.url
);
const contentRuntimeFile = "$resources.asset-query-vendor.js";
const appRoot = "app";
const generatedDir = join(appRoot, "__generated__");
const routesDir = join(appRoot, "routes");
const generatedOutputDirectories = [generatedDir, routesDir] as const;

type SiteDataByPage = {
  [id: Page["id"]]: {
    page: Page;
    build: {
      props: [Prop["id"], Prop][];
      instances: [Instance["id"], Instance][];
      dataSources: [DataSource["id"], DataSource][];
      resources: [Resource["id"], Resource][];
      deployment?: Deployment | undefined;
    };
    assets: Array<Asset>;
    params?: Params;
    pages: Array<Page>;
    publishedContentBlocks?: ReadonlyMap<string, PublishedContentBlock>;
  };
};

const getBoundSystemRouteParameter = (expression: string) => {
  const path = parseStaticMemberPath(expression);
  const variable = path?.[0];
  const isSystem =
    variable === "system" ||
    (variable !== undefined &&
      decodeDataSourceVariable(variable) === SYSTEM_VARIABLE_ID);
  return path?.length === 3 && isSystem && path[1] === "params"
    ? path[2]
    : undefined;
};

const getStaticAssetQueryFilter = (
  filter: StructuredAssetQueryFilterBinding
): AssetQueryFilter | undefined => {
  const value = parseJsonExpression(filter.value);
  if (value === undefined) {
    return;
  }
  const parsed = assetQueryFilter.safeParse({
    field: filter.field,
    operator: filter.operator,
    value,
  });
  return parsed.success ? parsed.data : undefined;
};

const evaluatePrerenderWhere = ({
  document,
  where,
  routeValues,
}: {
  document: ContentDatabaseDocument;
  where: StructuredAssetQueryWhereBinding;
  routeValues: ReadonlyMap<string, string>;
}): boolean | undefined => {
  return evaluateQueryWhere(where, (condition) => {
    const routeParameter = getBoundSystemRouteParameter(condition.value);
    const routeValue =
      routeParameter === undefined
        ? undefined
        : routeValues.get(routeParameter);
    let filter = getStaticAssetQueryFilter(condition);
    if (routeValue !== undefined) {
      const parsed = assetQueryFilter.safeParse({
        ...condition,
        value: routeValue,
      });
      filter = parsed.success ? parsed.data : undefined;
    }
    if (filter === undefined) {
      return;
    }
    return matchesAssetQueryFilter(document, filter);
  });
};

const getRouteCandidates = ({
  document,
  where,
  routeParameterNames,
}: {
  document: ContentDatabaseDocument;
  where: StructuredAssetQueryWhereBinding;
  routeParameterNames: ReadonlySet<string>;
}) => {
  const candidates = new Map<string, Set<string>>();
  for (const filter of getQueryConditions(where)) {
    const routeParameter = getBoundSystemRouteParameter(filter.value);
    if (
      routeParameter === undefined ||
      routeParameterNames.has(routeParameter) === false
    ) {
      continue;
    }
    const value = getAssetQueryFieldValue(document, filter.field);
    const values =
      filter.operator === "eq" && typeof value === "string"
        ? [value]
        : filter.operator === "contains" && Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string")
          : [];
    if (values.length === 0) {
      continue;
    }
    let parameterCandidates = candidates.get(routeParameter);
    if (parameterCandidates === undefined) {
      parameterCandidates = new Set();
      candidates.set(routeParameter, parameterCandidates);
    }
    for (const candidate of values) {
      if (candidate.length > 0) {
        parameterCandidates.add(candidate);
      }
    }
  }
  return candidates;
};

const canEnumerateRouteCondition = ({
  condition,
  routeParameter,
  index,
}: {
  condition: StructuredAssetQueryFilterBinding;
  routeParameter: string;
  index: NonNullable<PublishedProjectBundle["assetIndex"]>;
}) => {
  if (getBoundSystemRouteParameter(condition.value) !== routeParameter) {
    return false;
  }
  if (condition.operator === "eq") {
    return true;
  }
  return (
    condition.operator === "contains" &&
    index.documents.every(
      (document) =>
        typeof getAssetQueryFieldValue(document, condition.field) !== "string"
    )
  );
};

const isRouteParameterConstrained = ({
  where,
  routeParameter,
  index,
}: {
  where: StructuredAssetQueryWhereBinding;
  routeParameter: string;
  index: NonNullable<PublishedProjectBundle["assetIndex"]>;
}): boolean => {
  if ("field" in where) {
    return canEnumerateRouteCondition({
      condition: where,
      routeParameter,
      index,
    });
  }
  const children = "all" in where ? where.all : where.any;
  if ("all" in where) {
    return children.some((child) =>
      isRouteParameterConstrained({ where: child, routeParameter, index })
    );
  }
  return (
    children.length > 0 &&
    children.every((child) =>
      isRouteParameterConstrained({ where: child, routeParameter, index })
    )
  );
};

export const getAssetResourcePrerenderPaths = ({
  pagePath,
  resources,
  index,
  requireCompleteEnumeration = false,
}: {
  pagePath: string;
  resources: readonly [string, Resource][];
  index: PublishedProjectBundle["assetIndex"];
  requireCompleteEnumeration?: boolean;
}) => {
  const pathParameters = [...matchPathnameParams(pagePath)];
  if (
    pathParameters.length === 0 ||
    pathParameters.some(
      (match) =>
        match.groups?.name === undefined || (match.groups.modifier ?? "") !== ""
    )
  ) {
    return [];
  }
  const routeParameterNames = new Set(
    pathParameters.map((match) => match.groups?.name as string)
  );
  if (index === undefined) {
    return [];
  }
  const configurations = resources.flatMap(([, resource]) => {
    if (isAssetsResource(resource) === false) {
      return [];
    }
    const configuration = parseStructuredAssetQueryResourceBody(resource.body);
    return configuration === undefined ? [] : [configuration];
  });
  let enumerableConfigurations = configurations;
  if (requireCompleteEnumeration && configurations.length > 0) {
    const configurationsByParameters = configurations.map((configuration) => {
      const boundRouteParameters = new Set(
        getQueryConditions(configuration.where).flatMap((condition) => {
          const routeParameter = getBoundSystemRouteParameter(condition.value);
          return routeParameter !== undefined &&
            routeParameterNames.has(routeParameter)
            ? [routeParameter]
            : [];
        })
      );
      return { configuration, boundRouteParameters };
    });
    const routeConfigurations = configurationsByParameters.filter(
      ({ boundRouteParameters }) => boundRouteParameters.size > 0
    );
    const completeRouteConfigurations = routeConfigurations.filter(
      ({ boundRouteParameters }) =>
        [...routeParameterNames].every((routeParameter) =>
          boundRouteParameters.has(routeParameter)
        )
    );
    if (
      routeConfigurations.length > 0 &&
      completeRouteConfigurations.length === 0
    ) {
      throw new Error(
        "Dynamic SSG route parameters must be completely enumerated by one Assets query"
      );
    }
    let firstUnenumerableParameter: string | undefined;
    enumerableConfigurations = completeRouteConfigurations.flatMap(
      ({ configuration, boundRouteParameters }) => {
        for (const routeParameter of boundRouteParameters) {
          if (
            isRouteParameterConstrained({
              where: configuration.where,
              routeParameter,
              index,
            }) === false
          ) {
            firstUnenumerableParameter ??= routeParameter;
            return [];
          }
        }
        return [configuration];
      }
    );
    if (
      completeRouteConfigurations.length > 0 &&
      enumerableConfigurations.length === 0
    ) {
      throw new Error(
        `Dynamic SSG route parameter ${JSON.stringify(firstUnenumerableParameter)} cannot be completely enumerated from every Assets query branch`
      );
    }
  }
  const paths = new Set<string>();
  for (const configuration of enumerableConfigurations) {
    let evaluatedCandidates = 0;
    for (const document of index.documents) {
      const candidates = getRouteCandidates({
        document,
        where: configuration.where,
        routeParameterNames,
      });
      if (
        [...routeParameterNames].some(
          (name) => (candidates.get(name)?.size ?? 0) === 0
        )
      ) {
        continue;
      }
      const parameterNames = [...routeParameterNames];
      const values = new Map<string, string>();
      const addPaths = (position: number) => {
        if (position < parameterNames.length) {
          const name = parameterNames[position];
          for (const value of candidates.get(name) ?? []) {
            values.set(name, value);
            addPaths(position + 1);
          }
          values.delete(name);
          return;
        }
        evaluatedCandidates += 1;
        if (
          evaluatedCandidates >
          assetResourceLimits.candidateDocuments *
            assetResourceLimits.filterCount
        ) {
          throw new Error(
            "Dynamic SSG route candidates exceed the Assets limit"
          );
        }
        if (
          evaluatePrerenderWhere({
            document,
            where: configuration.where,
            routeValues: values,
          }) === false
        ) {
          return;
        }
        let path = pagePath;
        for (const match of [...pathParameters].reverse()) {
          const name = match.groups?.name as string;
          const value = values.get(name) as string;
          path = `${path.slice(0, match.index)}${encodeURIComponent(value)}${path.slice((match.index ?? 0) + match[0].length)}`;
        }
        paths.add(path);
        if (paths.size > assetResourceLimits.candidateDocuments) {
          throw new Error("Dynamic SSG path count exceeds the Assets limit");
        }
      };
      addPaths(0);
    }
  }
  return [...paths].sort();
};

const mergeJsonInto = async (sourcePath: string, destinationPath: string) => {
  const sourceJson = await readFile(sourcePath, "utf8");
  const destinationJson = await readFile(destinationPath, "utf8").catch(
    (error) => {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return "{}";
      }

      throw new Error(error);
    }
  );
  const content = JSON.stringify(
    merge(JSON.parse(destinationJson), JSON.parse(sourceJson), {
      arrayMerge: (_target, source) => source,
    }),
    null,
    "  "
  );

  await writeFile(destinationPath, content, "utf8");
};

const readAssetBaseUrl = async (constantsPath: string) => {
  const source = await readFile(constantsPath, "utf8");
  const program = parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  for (const node of program.body) {
    if (
      node.type !== "ExportNamedDeclaration" ||
      node.declaration?.type !== "VariableDeclaration"
    ) {
      continue;
    }
    for (const declaration of node.declaration.declarations) {
      if (
        declaration.id.type === "Identifier" &&
        declaration.id.name === "assetBaseUrl" &&
        declaration.init?.type === "Literal" &&
        typeof declaration.init.value === "string"
      ) {
        return declaration.init.value;
      }
    }
  }
  throw new Error(
    `Cannot read exported string assetBaseUrl from ${constantsPath}`
  );
};

const configureSsgAssetResourceFetch = async ({
  enabled,
}: {
  enabled: boolean;
}) => {
  const ssgFetchPath = join(cwd(), "app", "asset-resource-fetch.ts");
  if (existsSync(ssgFetchPath)) {
    const content = enabled
      ? await readSsgAssetResourceFetchTemplate()
      : `export const createSsgAssetResourceFetch = (_options: unknown) =>
  async (_input: RequestInfo | URL, _init?: RequestInit) => undefined;\n`;
    await writeFileIfChanged(ssgFetchPath, content);
  }
};

const generateAssetQueryRuntimeModule = ({
  deploymentId,
  index,
  runtimeAssets,
}: {
  deploymentId: string;
  index: ContentRuntimeArtifact | undefined;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
}) => {
  const inputType = `{
    request: Request;
    context: unknown;
    fallback: typeof fetch;
  }`;
  if (index === undefined) {
    return `export const createGeneratedAssetResourceFetch = async ({ fallback }: ${inputType}): Promise<typeof fetch> => fallback;\n`;
  }
  return `import { createGeneratedAssetResourceRuntime } from "./${contentRuntimeFile}";
import { assetQueryDatabase } from "./$resources.asset-query-manifest";

const deploymentId = ${JSON.stringify(deploymentId)};
const runtimeAssets = ${JSON.stringify(runtimeAssets)};
const createRuntimeFetch = createGeneratedAssetResourceRuntime({
  deploymentId,
  artifact: assetQueryDatabase,
  runtimeAssets,
});

export const createGeneratedAssetResourceFetch = ({ request, fallback }: ${inputType}) =>
  createRuntimeFetch({ request, fallback });
`;
};

const materializeVerifiedAssetIndex = async ({
  index,
  runtimeAssets,
  includeDocumentRuntimeAssets,
  generatedDirectory,
  deploymentId,
}: {
  index: ContentArtifactV1 | undefined;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  includeDocumentRuntimeAssets: boolean;
  generatedDirectory: string;
  deploymentId: string;
}) => {
  const runtimeIndex =
    index === undefined ? undefined : createContentRuntimeArtifact(index);
  const serializedIndex =
    runtimeIndex === undefined
      ? undefined
      : serializeContentRuntimeArtifact(runtimeIndex);
  const runtimeAssetIds =
    runtimeIndex === undefined
      ? []
      : getContentRuntimeArtifactRuntimeAssetIds({
          artifact: runtimeIndex,
          includeDocuments: includeDocumentRuntimeAssets,
        });
  const referencedAssetIds = new Set(
    index === undefined ? [] : getContentArtifactReferencedAssetIds(index)
  );
  const documentIds = new Set(
    runtimeIndex?.documentGraph?.nodes.map(({ id }) => id) ?? []
  );
  const selectedRuntimeAssets = Object.fromEntries(
    runtimeAssetIds.map((assetId) => {
      const asset = runtimeAssets[assetId];
      if (asset === undefined) {
        throw new Error(
          referencedAssetIds.has(assetId)
            ? `Published referenced asset URL is unavailable for ${assetId}`
            : `Published asset runtime data is unavailable for ${assetId}`
        );
      }
      if (documentIds.has(assetId)) {
        return [assetId, asset];
      }
      const { contentRef: _contentRef, ...runtimeAsset } = asset;
      return [assetId, runtimeAsset];
    })
  );
  const runtimePath = join(generatedDirectory, contentRuntimeFile);
  if (runtimeIndex === undefined) {
    await rm(runtimePath, { force: true });
  } else {
    await cp(contentRuntimeBundleUrl, runtimePath);
  }
  await writeFile(
    join(generatedDirectory, "$resources.asset-query-manifest.ts"),
    serializedIndex === undefined
      ? `export const assetQueryDeploymentId = ${JSON.stringify(deploymentId)};
export const assetQueryDatabase = undefined;
`
      : `export const assetQueryDeploymentId = ${JSON.stringify(deploymentId)};
export const assetQueryDatabase = ${serializedIndex};
`,
    "utf8"
  );
  await writeFile(
    join(generatedDirectory, "$resources.asset-query-runtime.ts"),
    generateAssetQueryRuntimeModule({
      deploymentId,
      index: runtimeIndex,
      runtimeAssets: selectedRuntimeAssets,
    }),
    "utf8"
  );
};

export const materializeAssetIndex = async ({
  index,
  ...options
}: {
  index: PublishedProjectBundle["assetIndex"];
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  includeDocumentRuntimeAssets: boolean;
  generatedDirectory: string;
  deploymentId: string;
}) =>
  materializeVerifiedAssetIndex({
    ...options,
    index: index === undefined ? undefined : await verifyContentArtifact(index),
  });

const writeWsAuthResources = async (
  generatedDir: string,
  pages: Pages,
  projectSettings:
    | PublishedProjectBundle["build"]["projectSettings"]
    | undefined,
  writeGeneratedFile: (file: string, content: string) => Promise<unknown>
) => {
  const { content, module } = createAuthConfigResources(pages, projectSettings);
  await createFolderIfNotExists(dirname(LOCAL_AUTH_FILE));
  await writeFileIfChanged(LOCAL_AUTH_FILE, content);
  await writeGeneratedFile(
    join(generatedDir, "$resources.wsauth.server.ts"),
    module
  );
};

const isGeneratedOutputPath = (path: string) =>
  generatedOutputDirectories.some((directory) => {
    const relativePath = relative(directory, path);
    return (
      relativePath !== "" &&
      relativePath !== ".." &&
      relativePath.startsWith(`..${sep}`) === false &&
      isAbsolute(relativePath) === false
    );
  });

const readGeneratedFilesManifest = async () => {
  const value = JSON.parse(await readFile(generatedFilesManifest, "utf8"));
  if (
    Array.isArray(value) === false ||
    value.some(
      (path) =>
        typeof path !== "string" || isGeneratedOutputPath(path) === false
    )
  ) {
    throw new Error("Generated files manifest is invalid.");
  }
  return new Set<string>(value);
};

const removeObsoleteGeneratedFiles = async (
  previousFiles: ReadonlySet<string>,
  generatedFiles: ReadonlySet<string>
) => {
  for (const path of previousFiles) {
    if (generatedFiles.has(path) === false) {
      await rm(path, { force: true });
    }
  }
};

/**
 * Check if template is internal cli template or external path
 */
const isCliTemplate = async (template: string) => {
  const currentPath = fileURLToPath(new URL(import.meta.url));

  const templatesPath = normalize(
    join(dirname(currentPath), "..", "templates")
  );

  const dirents = await readdir(templatesPath, { withFileTypes: true });

  for (const dirent of dirents) {
    if (dirent.isDirectory() && dirent.name === template) {
      return true;
    }
  }
  return false;
};

/**
 * template can be internal cli template or external path
 */
const getTemplatePath = async (template: string) => {
  const currentPath = fileURLToPath(new URL(import.meta.url));

  const templatePath = (await isCliTemplate(template))
    ? normalize(join(dirname(currentPath), "..", "templates", template))
    : template;

  return templatePath;
};

const copyTemplates = async (template: string) => {
  const templatePath = await getTemplatePath(template);

  await cp(templatePath, cwd(), {
    recursive: true,
    filter: (source) => {
      const name = basename(source);
      return name !== "package.json" && name !== "tsconfig.json";
    },
  });

  if (existsSync(join(templatePath, "package.json"))) {
    await mergeJsonInto(
      join(templatePath, "package.json"),
      join(cwd(), "package.json")
    );
  }
  if (existsSync(join(templatePath, "tsconfig.json"))) {
    await mergeJsonInto(
      join(templatePath, "tsconfig.json"),
      join(cwd(), "tsconfig.json")
    );
  }
};

const importFrom = (importee: string, importer: string) => {
  return relative(dirname(importer), importee).replaceAll("\\", "/");
};

const npmrc = `force=true
engine-strict=true
loglevel=error
audit=false
fund=false
`;

export const generateRedirectsModule = (pageRedirects: Pages["redirects"]) => {
  const redirects =
    pageRedirects?.map((redirect) => ({
      old: redirect.old,
      new: redirect.new,
      status: redirect.status ?? 301,
    })) ?? [];

  return `
    export const redirects = ${JSON.stringify(redirects, null, 2)};
    `;
};

const generateRedirectFallbackRoute = (runtime: "remix" | "react-router") => {
  const loaderFunctionArgs =
    runtime === "react-router" ? "react-router" : "@remix-run/server-runtime";

  return `
    import { type LoaderFunctionArgs } from ${JSON.stringify(
      loaderFunctionArgs
    )};
    import { redirectRequest } from "../redirect-url";
    // @todo think about how to make __generated__ typeable
    // @ts-ignore
    import { redirects } from "../__generated__/$resources.redirects";

    export const loader = ({ request }: LoaderFunctionArgs) => {
      const redirectResponse = redirectRequest(request, redirects);
      if (redirectResponse !== undefined) {
        return redirectResponse;
      }

      throw new Response("Not Found", { status: 404 });
    };
    `;
};

export const prebuild = async (options: {
  /**
   * Do we need download assets
   **/
  assets: boolean;
  /**
   * Template to use for the build in addition to defaults template
   **/
  template: string[];
  /** Keep generated-project progress off stdout for JSON and MCP callers. */
  silent?: boolean;
  /** Generate draft routes for local verification without publishing them. */
  includeDraftPages?: boolean;
  /** Preserve the generated tree and atomically replace only changed files. */
  incremental?: boolean;
  /** Retain route template inputs for a later incremental generation. */
  preserveRouteTemplates?: boolean;
  /** Emit a public identity marker used only by the local preview controller. */
  previewIdentity?: boolean;
  /** Read already-synced assets from this directory before downloading them. */
  sourceAssetsDirectory?: string;
}) => {
  const buildRoot = cwd();
  const feedback = options.silent
    ? {
        error: () => undefined,
        step: () => undefined,
      }
    : log;
  const createProgress = options.silent
    ? () => ({
        start: () => undefined,
        stop: () => undefined,
      })
    : spinner;
  if (options.template.length === 0) {
    feedback.error(
      `Template is not provided\nPlease check webstudio --help for more details`
    );
    exit(1);
  }
  if (
    options.template.includes("react-router-docker") &&
    options.template.includes("react-router") === false
  ) {
    throw new Error(
      'Template "react-router-docker" is an overlay and requires "react-router". Use --template react-router --template react-router-docker.'
    );
  }

  for (const template of options.template) {
    // Template is local user template
    if (template.startsWith(".") || template.startsWith("/")) {
      continue;
    }

    if ((await isCliTemplate(template)) === false) {
      feedback.error(
        `Template ${options.template} is not available\nPlease check webstudio --help for more details`
      );
      exit(1);
    }
  }

  feedback.step("Scaffolding the project files");

  if (options.incremental !== true) {
    await rm(generatedDir, { recursive: true, force: true });
  }

  if (options.incremental !== true) {
    await rm(routesDir, { recursive: true, force: true });
  }

  const generatedFiles = new Set<string>();
  const previousGeneratedFiles =
    options.incremental === true
      ? await readGeneratedFilesManifest()
      : new Set<string>();
  const writeGeneratedFile = async (file: string, content: string) => {
    generatedFiles.add(normalize(file));
    if (options.incremental === true) {
      return await writeFileIfChanged(file, content);
    }
    await createFileIfNotExists(file, content);
    return true;
  };

  // force npm to install with not matching peer dependencies
  await writeFile(join(cwd(), ".npmrc"), npmrc);

  if (options.incremental !== true) {
    for (const template of options.template) {
      await copyTemplates(template);
    }
  }

  const preserveRouteTemplates =
    options.incremental === true || options.preserveRouteTemplates === true;
  const frameworkOptions = {
    preserveTemplates: preserveRouteTemplates,
    templatesDirectory: join(buildRoot, routeTemplatesDirectory),
  };
  let framework;
  if (options.template.includes("ssg")) {
    framework = await createVikeSsgFramework(frameworkOptions);
  } else if (options.template.includes("react-router")) {
    framework = await createReactRouterFramework(frameworkOptions);
  } else {
    framework = await createRemixFramework(frameworkOptions);
  }

  const assetBaseUrl = await readAssetBaseUrl(join(cwd(), "app/constants.mjs"));

  const loadedSiteData = await loadJSONFile<unknown>(LOCAL_DATA_FILE);

  if (loadedSiteData === null) {
    throw new Error(
      `Project bundle is missing, please make sure the project is synced.`
    );
  }
  const parsedSiteData = publishedProjectBundle.safeParse(loadedSiteData);
  if (parsedSiteData.success === false) {
    throw Object.assign(
      new Error(
        `Project bundle is invalid, please make sure the project is synced. Invalid fields: ${formatZodIssues(
          parsedSiteData.error.issues,
          loadedSiteData
        )}`
      ),
      {
        code: "PROJECT_BUNDLE_INVALID",
        bundleVersion,
        issues: getZodValidationIssues(parsedSiteData.error),
      }
    );
  }
  const siteData = parsedSiteData.data;
  const pages = migratePages(siteData.build.pages);
  const publicationBuild = { ...siteData.build, pages };
  const verifiedAssetIndex =
    siteData.assetIndex === undefined
      ? undefined
      : await verifyContentArtifact(siteData.assetIndex);
  let dynamicMdxCandidates: ReadonlyMap<string, readonly string[]> | undefined;
  if (hasDynamicPublishedMdxSources(publicationBuild)) {
    dynamicMdxCandidates =
      verifiedAssetIndex === undefined
        ? new Map()
        : resolvePublishedMdxAssetCandidates({
            build: publicationBuild,
            artifact: verifiedAssetIndex,
            allowUnresolved: true,
          });
    for (const blockInstanceId of getDynamicPublishedMdxSourceBlockIds(
      publicationBuild
    )) {
      if (dynamicMdxCandidates.has(blockInstanceId)) {
        continue;
      }
      console.warn(
        JSON.stringify({
          type: "webstudio-build-warning",
          feature: "content-block-mdx",
          code: "invalid-mdx",
          severity: "error",
          blockInstanceId,
          renderScope: `publication:block:${blockInstanceId}`,
          message:
            "The dynamic MDX source has no finite, discoverable Asset candidate set and was skipped.",
        })
      );
    }
  }
  const assetCompilationPlan = createPublishedBuildContentCompilationPlan(
    publicationBuild,
    dynamicMdxCandidates
  );
  await configureSsgAssetResourceFetch({
    enabled: siteData.assetIndex !== undefined,
  });

  const usedMetas = new Map<Instance["component"], WsComponentMeta>(
    Object.entries(coreMetas)
  );
  const publishablePages = getPublishablePages(pages);
  const generatedPages = options.includeDraftPages
    ? getAllPages(pages)
    : publishablePages;
  await writeWsAuthResources(
    generatedDir,
    pages,
    siteData.build.projectSettings,
    writeGeneratedFile
  );
  const siteDataByPage: SiteDataByPage = {};
  const fontAssetsByPage: Record<Page["id"], string[]> = {};
  const backgroundImageAssetsByPage: Record<Page["id"], string[]> = {};

  // use whole project props to access id props from other pages
  const normalizedProps = normalizeProps({
    props: siteData.build.props.map(([_id, prop]) => prop),
    assetBaseUrl,
    assets: new Map(siteData.assets.map((asset) => [asset.id, asset])),
    uploadingImageAssets: [],
    pages,
    source: "prebuild",
  });
  const normalizedPropsMap = new Map(
    normalizedProps.map((prop) => [prop.id, prop])
  );

  for (const page of generatedPages) {
    const instanceMap = new Map(siteData.build.instances);
    const pageInstanceSet = findTreeInstanceIdsExcludingStaticHidden({
      instances: instanceMap,
      props: normalizedPropsMap,
      rootInstanceId: page.rootInstanceId,
    });
    // support global data variables
    pageInstanceSet.add(ROOT_INSTANCE_ID);
    // collect used instances and metas
    const instances: [Instance["id"], Instance][] = [];
    for (const [_instanceId, instance] of siteData.build.instances) {
      if (pageInstanceSet.has(instance.id)) {
        instances.push([instance.id, instance]);
        const meta = framework.metas[instance.component];
        if (meta) {
          usedMetas.set(instance.component, meta);
        }
      }
    }

    const resourceIds = new Set<Resource["id"]>();

    const props: [Prop["id"], Prop][] = [];
    for (const prop of normalizedProps) {
      if (pageInstanceSet.has(prop.instanceId)) {
        props.push([prop.id, prop]);
        if (prop.type === "resource") {
          resourceIds.add(prop.value);
        }
      }
    }

    const dataSources: [DataSource["id"], DataSource][] = [];
    for (const [dataSourceId, dataSource] of siteData.build.dataSources) {
      if (pageInstanceSet.has(dataSource.scopeInstanceId ?? "")) {
        dataSources.push([dataSourceId, dataSource]);
        if (dataSource.type === "resource") {
          resourceIds.add(dataSource.resourceId);
        }
      }
    }

    const resources: [Resource["id"], Resource][] = [];
    for (const [resourceId, resource] of siteData.build.resources ?? []) {
      if (resourceIds.has(resourceId)) {
        resources.push([resourceId, resource]);
      }
    }

    siteDataByPage[page.id] = {
      build: {
        props,
        instances,
        dataSources,
        resources,
      },
      pages: publishablePages,
      page,
      assets: siteData.assets,
    };
  }

  const assets = new Map(siteData.assets.map((asset) => [asset.id, asset]));
  const runtimeAssetsById = Object.fromEntries(
    siteData.assets.map((asset) => {
      const runtimeAsset = toAssetReferenceRuntimeData(
        asset,
        "https://placeholder.local"
      );
      return [
        asset.id,
        {
          ...runtimeAsset,
          contentRef: asset.name,
          // SaaS serves project assets through its storage-backed proxy.
          // Generated projects with downloaded assets serve them locally.
          url:
            siteData.build.deployment?.destination === "saas" &&
            options.assets === false
              ? new URL(runtimeAsset.url, siteData.origin).href
              : `${assetBaseUrl}${asset.name}`,
        },
      ];
    })
  );
  const publishedInstances = new Map(siteData.build.instances);
  const publishedProps = new Map(siteData.build.props);
  const publishedStyleSources = new Map(siteData.build.styleSources);
  const publishedStyleSourceSelections = new Map(
    siteData.build.styleSourceSelections
  );
  const publishedStyles = new Map(siteData.build.styles);
  const publishedBreakpoints = new Map(siteData.build.breakpoints);
  if (verifiedAssetIndex !== undefined) {
    const cache = createPublishedMdxMaterializationCache();
    const mergeRecords = <Value>(
      target: Map<string, Value>,
      records: Iterable<readonly [string, Value]>,
      namespace: string
    ) => {
      for (const [key, value] of records) {
        const existing = target.get(key);
        if (existing !== undefined && deepEqual(existing, value)) {
          continue;
        }
        if (existing !== undefined) {
          throw new Error(
            `Published MDX ${namespace} collision for ${JSON.stringify(key)}`
          );
        }
        target.set(key, value);
      }
    };

    for (const page of generatedPages) {
      const pageData = siteDataByPage[page.id];
      const route = getPagePath(page.id, pages);
      const pageInstances = new Map(pageData.build.instances);
      const pageProps = new Map(pageData.build.props);
      const materializationProps = new Map(
        siteData.build.props.filter(([, prop]) =>
          pageInstances.has(prop.instanceId)
        )
      );
      const pageDataSources = new Map(pageData.build.dataSources);
      const pageResources = new Map(pageData.build.resources);
      const candidatesByBlock = new Map<string, PublishedContentBlock>();
      const processedBlockIds = new Set<string>();

      for (;;) {
        const pendingBlockIds = new Set<string>();
        for (const instanceId of findTreeInstanceIdsExcludingBlockTemplates(
          pageInstances,
          page.rootInstanceId
        )) {
          if (
            processedBlockIds.has(instanceId) === false &&
            pageInstances.get(instanceId)?.component === blockComponent
          ) {
            pendingBlockIds.add(instanceId);
          }
        }
        if (pendingBlockIds.size === 0) {
          break;
        }
        for (const blockId of pendingBlockIds) {
          processedBlockIds.add(blockId);
        }
        const pageBuild = {
          instances: Array.from(pageInstances.values()),
          props: Array.from(materializationProps.values()),
          dataSources: Array.from(pageDataSources.values()),
          resources: Array.from(pageResources.values()),
        };
        const pageDynamicCandidates = hasDynamicPublishedMdxSources(
          pageBuild,
          pendingBlockIds
        )
          ? resolvePublishedMdxAssetCandidates({
              build: pageBuild,
              artifact: verifiedAssetIndex,
              blockInstanceIds: pendingBlockIds,
            })
          : undefined;
        const materialized = await materializePublishedMdx({
          route,
          data: {
            instances: pageInstances,
            props: materializationProps,
            dataSources: pageDataSources,
            resources: pageResources,
            styleSources: publishedStyleSources,
            styleSourceSelections: publishedStyleSourceSelections,
            styles: publishedStyles,
            breakpoints: publishedBreakpoints,
            assets,
          },
          artifact: verifiedAssetIndex,
          metas: usedMetas,
          projectId: siteData.build.projectId,
          cache,
          dynamicAssetIdsByBlock: pageDynamicCandidates,
          blockInstanceIds: pendingBlockIds,
          runtimeAssets: runtimeAssetsById,
        });
        for (const root of materialized.roots) {
          const diagnostic = getUnsafeDynamicPublishedMdxDiagnostic({
            root,
            route,
            dataSources: pageDataSources,
            props: materializationProps,
          });
          if (diagnostic !== undefined) {
            console.warn(
              JSON.stringify({
                type: "webstudio-build-warning",
                feature: "content-block-mdx",
                route,
                ...diagnostic,
              })
            );
            continue;
          }
          const fragmentData = createWebstudioDataFromFragment(root.fragment);
          mergeRecords(pageInstances, fragmentData.instances, "instance");
          mergeRecords(publishedInstances, fragmentData.instances, "instance");
          mergeRecords(
            materializationProps,
            fragmentData.props,
            "authored prop"
          );
          const normalizedFragmentProps = normalizeProps({
            props: root.fragment.props,
            assetBaseUrl,
            assets,
            uploadingImageAssets: [],
            pages,
            source: "prebuild",
          });
          const normalizedProps = normalizedFragmentProps.map(
            (prop) => [prop.id, prop] as const
          );
          mergeRecords(pageProps, normalizedProps, "prop");
          mergeRecords(publishedProps, normalizedProps, "prop");
          mergeRecords(
            pageDataSources,
            fragmentData.dataSources,
            "data source"
          );
          mergeRecords(pageResources, fragmentData.resources, "resource");
          mergeRecords(
            publishedStyleSources,
            fragmentData.styleSources,
            "style source"
          );
          mergeRecords(
            publishedStyleSourceSelections,
            fragmentData.styleSourceSelections,
            "style source selection"
          );
          mergeRecords(
            publishedStyles,
            fragmentData.styles,
            "style declaration"
          );
          mergeRecords(
            publishedBreakpoints,
            fragmentData.breakpoints,
            "breakpoint"
          );
          const previous = candidatesByBlock.get(root.identity.blockInstanceId);
          const blockInstance = pageInstances.get(
            root.identity.blockInstanceId
          );
          const bodyInstanceId =
            blockInstance === undefined
              ? undefined
              : findContentBlockBodyContainers({
                  blockInstance,
                  instances: pageInstances,
                })[0]?.id;
          candidatesByBlock.set(root.identity.blockInstanceId, {
            ...(bodyInstanceId === undefined ? {} : { bodyInstanceId }),
            ...(root.source.type === "expression"
              ? { sourceExpression: root.source.value }
              : {}),
            candidates: [
              ...(previous?.candidates ?? []),
              {
                assetId: root.identity.assetId,
                dependencyRevision: root.dependencyRevision,
                children: root.fragment.children,
                frontmatter: root.resolvedFrontmatter,
                resourceIds: root.fragment.resources.map(({ id }) => id),
              },
            ],
          });
        }
        for (const warning of materialized.warnings) {
          console.warn(
            JSON.stringify({
              type: "webstudio-build-warning",
              feature: "content-block-mdx",
              route: warning.route,
              ...warning.diagnostic,
            })
          );
        }
      }
      pageData.build.instances = Array.from(pageInstances);
      pageData.build.props = Array.from(pageProps);
      pageData.build.dataSources = Array.from(pageDataSources);
      pageData.build.resources = Array.from(pageResources);
      pageData.publishedContentBlocks = candidatesByBlock;
    }
  }

  for (const page of generatedPages) {
    const pageInstances = new Map(siteDataByPage[page.id].build.instances);
    const renderedIds = findTreeInstanceIdsExcludingBlockTemplates(
      pageInstances,
      page.rootInstanceId
    );
    for (const block of siteDataByPage[
      page.id
    ].publishedContentBlocks?.values() ?? []) {
      if (block.sourceExpression !== undefined) {
        continue;
      }
      for (const candidate of block.candidates) {
        for (const child of candidate.children) {
          if (child.type === "id") {
            for (const instanceId of findTreeInstanceIdsExcludingBlockTemplates(
              pageInstances,
              child.value
            )) {
              renderedIds.add(instanceId);
            }
          }
        }
      }
    }
    const styleSourceIds = new Set(
      Array.from(publishedStyleSourceSelections.values())
        .filter(({ instanceId }) => renderedIds.has(instanceId))
        .flatMap(({ values }) => values)
    );
    const pageStyles = Array.from(publishedStyles.values()).filter(
      ({ styleSourceId }) => styleSourceIds.has(styleSourceId)
    );
    const fontFamilies = collectFontFamiliesFromStyleDecls(pageStyles);
    fontAssetsByPage[page.id] = siteData.assets
      .filter((asset) => asset.type === "font")
      .filter((asset) => fontFamilies.has(asset.meta.family))
      .map((asset) => asset.name);
    const backgroundImageAssetIds = new Set(
      pageStyles.flatMap(({ property, value }) =>
        property === "backgroundImage" && value.type === "layers"
          ? value.value.flatMap((layer) =>
              layer.type === "image" && layer.value.type === "asset"
                ? [layer.value.value]
                : []
            )
          : []
      )
    );
    backgroundImageAssetsByPage[page.id] = siteData.assets
      .filter((asset) => asset.type === "image")
      .filter((asset) => backgroundImageAssetIds.has(asset.id))
      .map((asset) => asset.name);
  }

  if (options.assets === true) {
    const assetOrigin = siteData.origin;

    if (!assetOrigin) {
      console.warn("Warning: Asset origin is not defined in project bundle.");
    }
  }

  const { cssText, classes } = generateCss({
    instances: publishedInstances,
    props: publishedProps,
    assets,
    breakpoints: publishedBreakpoints,
    styles: publishedStyles,
    styleSourceSelections: publishedStyleSourceSelections,
    // pass only used metas to not generate unused preset styles
    componentMetas: usedMetas,
    assetBaseUrl,
    atomic:
      siteData.build.projectSettings?.compiler.atomicStyles ??
      pages.compiler?.atomicStyles ??
      true,
  });

  await writeGeneratedFile(join(generatedDir, "index.css"), cssText);

  for (const page of generatedPages) {
    const scope = createScope([
      // manually maintained list of occupied identifiers
      "useState",
      "Fragment",
      "useResource",
      "useVariableState",
      "Page",
      "_props",
    ]);

    const pageData = siteDataByPage[page.id];
    const instances = new Map(pageData.build.instances);
    const documentType = page.meta.documentType ?? "html";
    let rootInstanceId = page.rootInstanceId;

    // cleanup xml markup
    if (documentType === "xml") {
      // treat first body child as root
      const bodyInstance = instances.get(rootInstanceId);
      // @todo test empty xml
      const firstChild = bodyInstance?.children.at(0);
      if (firstChild?.type === "id") {
        rootInstanceId = firstChild.value;
      }
      // remove all unexpected components
      for (const instance of instances.values()) {
        if (isCoreComponent(instance.component)) {
          continue;
        }
        if (usedMetas.get(instance.component)?.category === "xml") {
          continue;
        }
        instances.delete(instance.id);
      }
    }

    const props = new Map(pageData.build.props);
    const componentBuildContributions = new Map<
      string,
      ComponentBuildContribution
    >();
    for (const hook of framework.componentBuildHooks) {
      const contribution = await hook.build({
        instances,
        props,
        meta: framework.metas[hook.component],
        scope,
      });
      if (contribution !== undefined) {
        componentBuildContributions.set(hook.component, contribution);
      }
    }

    // generate component imports
    // Map<importSource, Map<id, importSpecifier>>
    const imports = new Map<string, Map<string, string>>();
    for (const instance of instances.values()) {
      if (componentBuildContributions.has(instance.component)) {
        continue;
      }
      let descriptor = framework.components[instance.component];
      let id = instance.component;
      if (instance.component === elementComponent && instance.tag) {
        descriptor = framework.tags[instance.tag];
        id = descriptor;
      }
      if (descriptor === undefined) {
        continue;
      }
      const [importSource, importSpecifier] = descriptor.split(":");
      let specifiers = imports.get(importSource);
      if (specifiers === undefined) {
        specifiers = new Map();
        imports.set(importSource, specifiers);
      }
      specifiers.set(id, importSpecifier);
    }
    let importsString = "";
    for (const [importSource, specifiers] of imports) {
      const specifiersString = Array.from(specifiers)
        .map(
          ([id, importSpecifier]) =>
            `${importSpecifier} as ${scope.getName(id, importSpecifier)}`
        )
        .join(", ");
      importsString += `import { ${specifiersString} } from "${importSource}";\n`;
    }

    const componentBuildDeclarations: string[] = [];
    for (const contribution of componentBuildContributions.values()) {
      for (const buildImport of contribution.imports) {
        if (buildImport.imported === undefined) {
          importsString += `import ${buildImport.local} from ${JSON.stringify(buildImport.source)};\n`;
        } else {
          importsString += `import { ${buildImport.imported} as ${buildImport.local} } from ${JSON.stringify(buildImport.source)};\n`;
        }
      }
      componentBuildDeclarations.push(...contribution.declarations);
    }
    const componentBuildSetupString = componentBuildDeclarations.join("\n");

    const pageFontAssets = fontAssetsByPage[page.id];
    const pageBackgroundImageAssets = backgroundImageAssetsByPage[page.id];

    const dataSources = new Map(pageData.build.dataSources);
    const resources = new Map(pageData.build.resources);
    replaceFormActionsWithResources({
      instances,
      resources,
      props,
    });
    const pageComponent = generateWebstudioComponent({
      scope,
      name: "Page",
      rootInstanceId,
      parameters: [
        {
          id: `page-system`,
          instanceId: "",
          name: "system",
          type: "parameter",
          value: page.systemDataSourceId ?? "",
        },
        {
          id: "global-system",
          type: "parameter",
          instanceId: "",
          name: "system",
          value: SYSTEM_VARIABLE_ID,
        },
      ],
      instances,
      props,
      resources,
      dataSources,
      classesMap: classes,
      metas: usedMetas,
      tagsOverrides: framework.tags,
      publishedContentBlocks: pageData.publishedContentBlocks,
    });

    const projectMeta = siteData.build.projectSettings?.meta ?? pages.meta;
    const contactEmail: undefined | string =
      // fallback to user email when contact email is empty string
      projectMeta?.contactEmail || siteData.user?.email || undefined;
    const favIconAsset = assets.get(projectMeta?.faviconAssetId ?? "")?.name;

    const pagePath = getPagePath(page.id, pages);

    const breakpoints = siteData.build.breakpoints
      .map(([_, value]) => ({
        id: value.id,
        minWidth: value.minWidth,
        maxWidth: value.maxWidth,
      }))
      .sort(compareMedia);

    // MARK: - TODO: XML GENERATION
    const pageExports = `/* eslint-disable */
      /* This is a auto generated file for building the project */ \n

      import { Fragment, useState } from "react";
      import { renderText, useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
      ${importsString}${componentBuildSetupString}

      export const projectId = "${siteData.build.projectId}";

      ${pagePath === "/" ? `export const projectVersion = ${siteData.build.version};` : ""}

      export const projectDomain = ${JSON.stringify(siteData.projectDomain)};

      export const lastPublished = "${new Date(
        siteData.build.createdAt
      ).toISOString()}";

      export const siteName = ${JSON.stringify(projectMeta?.siteName)};

      export const breakpoints = ${JSON.stringify(breakpoints)};

      export const favIconAsset: string | undefined =
        ${JSON.stringify(favIconAsset)};

      // Font assets on current page (can be preloaded)
      export const pageFontAssets: string[] =
        ${JSON.stringify(pageFontAssets)}

      export const pageBackgroundImageAssets: string[] =
        ${JSON.stringify(pageBackgroundImageAssets)}

      ${
        pagePath === "/"
          ? `
            ${
              projectMeta?.code
                ? `
            const Script = ({children, ...props}: Record<string, string | boolean>) => {
              if (children == null) {
                return <script {...props} />;
              }

              return <script {...props} dangerouslySetInnerHTML={{__html: children}} />;
            };
            const Style = ({children, ...props}: Record<string, string | boolean>) => {
              if (children == null) {
                return <style {...props} />;
              }

              return <style {...props} dangerouslySetInnerHTML={{__html: children}} />;
            };
            `
                : ""
            }

            export const CustomCode = () => {
              return (<>${
                projectMeta?.code ? htmlToJsx(projectMeta.code) : ""
              }</>);
            }
          `
          : ""
      }

      ${pageComponent}

      export { Page }
    `;

    const serverExports = `/* eslint-disable */
      /* This is a auto generated file for building the project */ \n

      import type { PageMeta } from "@webstudio-is/sdk";
      ${generateResources({
        scope,
        page,
        dataSources,
        props,
        resources,
        contentBlockResourceSelections: Array.from(
          pageData.publishedContentBlocks?.values() ?? []
        ).flatMap((block) =>
          block.sourceExpression === undefined
            ? []
            : [
                {
                  sourceExpression: block.sourceExpression,
                  candidates: block.candidates.map(
                    ({ assetId, resourceIds = [] }) => ({
                      assetId,
                      resourceIds,
                    })
                  ),
                },
              ]
        ),
      })}

      ${generatePageMeta({
        globalScope: scope,
        page,
        dataSources,
        assets,
      })}

      ${generateRemixParams(page.path)}

      export const contactEmail = ${JSON.stringify(contactEmail)};
    `;

    const generatedBasename = generateRemixRoute(pagePath);

    const clientFile = join(generatedDir, `${generatedBasename}.tsx`);
    await writeGeneratedFile(clientFile, pageExports);

    const serverFile = join(generatedDir, `${generatedBasename}.server.tsx`);
    await writeGeneratedFile(serverFile, serverExports);

    const getTemplates = framework[documentType];
    const prerenderPaths = getAssetResourcePrerenderPaths({
      pagePath,
      resources: pageData.build.resources,
      index: siteData.assetIndex,
      requireCompleteEnumeration: options.template.includes("ssg"),
    });
    for (const { file, template } of getTemplates({
      pagePath,
      prerenderPaths,
    })) {
      const content = template
        .replaceAll("__CONSTANTS__", importFrom("./app/constants.mjs", file))
        .replaceAll(
          "__SITEMAP__",
          importFrom(`./app/__generated__/$resources.sitemap.xml`, file)
        )
        .replaceAll(
          "__ASSETS__",
          importFrom(`./app/__generated__/$resources.assets`, file)
        )
        .replaceAll(
          "__ASSET_QUERY_MANIFEST__",
          importFrom(
            `./app/__generated__/$resources.asset-query-manifest`,
            file
          )
        )
        .replaceAll(
          "__ASSET_QUERY_RUNTIME__",
          importFrom(`./app/__generated__/$resources.asset-query-runtime`, file)
        )
        .replaceAll(
          "__ASSET_RESOURCE_FETCH__",
          importFrom("./app/asset-resource-fetch", file)
        )
        .replaceAll(
          "__AUTH__",
          importFrom(`./app/__generated__/$resources.wsauth.server`, file)
        )
        .replaceAll(
          "__CLIENT__",
          importFrom(`./app/__generated__/${generatedBasename}`, file)
        )
        .replaceAll(
          "__SERVER__",
          importFrom(`./app/__generated__/${generatedBasename}.server`, file)
        )
        .replaceAll(
          "__CSS__",
          importFrom(`./app/__generated__/index.css`, file)
        );
      await writeGeneratedFile(file, content);
    }
  }

  // MARK: - Default sitemap.xml
  for (const { file, template } of framework.defaultSitemap()) {
    const content = template.replaceAll(
      "__SITEMAP__",
      importFrom(`./app/__generated__/$resources.sitemap.xml`, file)
    );
    await writeGeneratedFile(file, content);
  }

  const sitemap = getStaticSiteMapXml(pages, siteData.build.updatedAt);
  await writeGeneratedFile(
    join(generatedDir, "$resources.sitemap.xml.ts"),
    `
      export const sitemap: Array<{ path: string; lastModified: string }> = ${JSON.stringify(sitemap, null, 2)};
    `
  );

  // Generate assets resource file. The same deployment URLs are used above
  // when resolving MDX frontmatter into generated component bindings.
  await materializeVerifiedAssetIndex({
    index: verifiedAssetIndex,
    runtimeAssets: runtimeAssetsById,
    includeDocumentRuntimeAssets:
      assetCompilationPlan !== undefined &&
      requiresRuntimeDocumentData(assetCompilationPlan),
    generatedDirectory: generatedDir,
    deploymentId: siteData.build.id,
  });

  if (options.previewIdentity) {
    const previewIdentityDirectory = join(buildRoot, "public", "__webstudio");
    await createFolderIfNotExists(previewIdentityDirectory);
    await writeFile(
      join(previewIdentityDirectory, "preview.json"),
      JSON.stringify({
        projectId: siteData.build.projectId,
        version: siteData.build.version,
      }),
      "utf8"
    );
  }

  await writeGeneratedFile(
    join(generatedDir, "$resources.assets.ts"),
    `
    export const assets = ${JSON.stringify(runtimeAssetsById, null, 2)};
    `
  );

  await writeGeneratedFile(
    join(generatedDir, "$resources.redirects.ts"),
    generateRedirectsModule(pages.redirects)
  );

  const redirectFallbackPath = join(routesDir, "$.tsx");
  if (
    pages.redirects !== undefined &&
    pages.redirects.length > 0 &&
    generatedFiles.has(normalize(redirectFallbackPath)) === false
  ) {
    await writeGeneratedFile(
      redirectFallbackPath,
      generateRedirectFallbackRoute(
        options.template.includes("react-router") ? "react-router" : "remix"
      )
    );
  }

  if (options.incremental === true) {
    await removeObsoleteGeneratedFiles(previousGeneratedFiles, generatedFiles);
  }
  await writeFileIfChanged(
    generatedFilesManifest,
    JSON.stringify([...generatedFiles].sort(), undefined, 2)
  );

  if (options.assets === true && siteData.assets.length > 0) {
    const downloading = createProgress();
    downloading.start("Downloading assets");
    await materializeAssetFiles({
      assets: siteData.assets,
      continueOnError: true,
      origin: siteData.origin || "",
      sourceAssetsDirectory:
        options.sourceAssetsDirectory ?? join(buildRoot, LOCAL_ASSETS_DIR),
      targetAssetsDirectory: join(buildRoot, "public", assetBaseUrl),
    });
    downloading.stop("Downloaded assets");
  }

  feedback.step("Build finished");
};
