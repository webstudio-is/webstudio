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
import {
  generateWebstudioComponent,
  type Params,
  normalizeProps,
  generateRemixRoute,
  generateRemixParams,
} from "@webstudio-is/react-sdk";
import type {
  Instance,
  Prop,
  Page,
  DataSource,
  Deployment,
  Asset,
  Resource,
  WsComponentMeta,
  Pages,
} from "@webstudio-is/sdk";
import {
  createScope,
  findTreeInstanceIds,
  getAllPages,
  getAssetResourceQuery,
  getPagePath,
  getPublishablePages,
  generateResources,
  generatePageMeta,
  getStaticSiteMapXml,
  replaceFormActionsWithResources,
  isCoreComponent,
  coreMetas,
  SYSTEM_VARIABLE_ID,
  generateCss,
  ROOT_INSTANCE_ID,
  elementComponent,
  toRuntimeAsset,
  assetResourceLimits,
  matchPathnameParams,
  parseAssetQueryResourceBody,
} from "@webstudio-is/sdk";
import {
  assetQueryPlanSelectsContent,
  getAssetResourceVariableFieldPaths,
} from "@webstudio-is/asset-resource";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import { collectFontFamiliesFromStyleDecls } from "@webstudio-is/project-build/runtime";
import {
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

export const generatedFilesManifest = join(
  ".webstudio",
  "generated-files.json"
);
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
  };
};

const getExpressionMemberPath = (node: unknown): string[] | undefined => {
  if (typeof node !== "object" || node === null) {
    return;
  }
  if (
    Reflect.get(node, "type") === "Identifier" &&
    typeof Reflect.get(node, "name") === "string"
  ) {
    return [Reflect.get(node, "name") as string];
  }
  if (Reflect.get(node, "type") !== "MemberExpression") {
    return;
  }
  const base = getExpressionMemberPath(Reflect.get(node, "object"));
  if (base === undefined) {
    return;
  }
  const computed = Reflect.get(node, "computed") === true;
  const property = Reflect.get(node, "property");
  const name = computed
    ? Reflect.get(property, "value")
    : Reflect.get(property, "name");
  return typeof name === "string" ? [...base, name] : undefined;
};

const getBoundSystemRouteParameter = (expression: string) => {
  try {
    const program = parse(`(${expression})`, { ecmaVersion: "latest" });
    const statement = program.body[0];
    const node =
      statement?.type === "ExpressionStatement"
        ? statement.expression
        : undefined;
    const path = getExpressionMemberPath(node);
    return path?.length === 3 && path[0] === "system" && path[1] === "params"
      ? path[2]
      : undefined;
  } catch {
    return;
  }
};

const getDocumentPathValue = (document: unknown, path: readonly string[]) => {
  let value = document;
  for (const segment of path) {
    if (typeof value !== "object" || value === null) {
      return;
    }
    value = Reflect.get(value, segment);
  }
  return value;
};

export const getAssetResourcePrerenderPaths = ({
  pagePath,
  resources,
  indexes,
}: {
  pagePath: string;
  resources: readonly [string, Resource][];
  indexes: PublishedProjectBundle["assetResourceIndexes"];
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
  const indexByResourceId = new Map(
    (indexes ?? []).map((snapshot) => [snapshot.resourceId, snapshot.index])
  );
  const paths = new Set<string>();
  for (const [, resource] of resources) {
    const index = indexByResourceId.get(resource.id);
    if (index === undefined) {
      continue;
    }
    const query = getAssetResourceQuery(resource);
    if (query === undefined) {
      continue;
    }
    const variableFields = getAssetResourceVariableFieldPaths(query);
    const routeFields = new Map<string, string[]>();
    for (const binding of parseAssetQueryResourceBody(resource.body)
      .variables) {
      const routeParameter = getBoundSystemRouteParameter(binding.value);
      const fieldPath = variableFields.get(binding.name);
      if (
        routeParameter !== undefined &&
        routeParameterNames.has(routeParameter) &&
        fieldPath !== undefined
      ) {
        routeFields.set(routeParameter, fieldPath);
      }
    }
    if (routeFields.size !== routeParameterNames.size) {
      continue;
    }
    for (const document of index.documents) {
      const values = new Map<string, string>();
      for (const [name, fieldPath] of routeFields) {
        const value = getDocumentPathValue(document, fieldPath);
        if (
          (typeof value === "string" && value.length > 0) ||
          (typeof value === "number" && Number.isFinite(value)) ||
          typeof value === "boolean"
        ) {
          values.set(name, String(value));
        }
      }
      if (values.size !== routeParameterNames.size) {
        continue;
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

const getResourceIndexPublicPath = (resourceId: string, revision: string) =>
  `/resource-indexes/${encodeURIComponent(resourceId)}.${encodeURIComponent(
    revision
  )}.json`;

export const getRequiredAssetResourceContentRefs = ({
  snapshots,
  resources,
}: {
  snapshots: NonNullable<PublishedProjectBundle["assetResourceIndexes"]>;
  resources: PublishedProjectBundle["build"]["resources"];
}) => {
  const resourcesById = new Map(resources);
  const required = new Set<string>();
  for (const snapshot of snapshots) {
    if (resourcesById.has(snapshot.resourceId) === false) {
      continue;
    }
    if (assetQueryPlanSelectsContent(snapshot.index.plan) === false) {
      continue;
    }
    for (const document of snapshot.index.documents) {
      required.add(document.contentRef);
    }
  }
  return required;
};

export const generateAssetQueryRuntimeModule = ({
  deploymentId,
  manifest,
}: {
  deploymentId: string;
  manifest: readonly {
    resourceId: string;
    revision: string;
    queryHash: string;
    assetRevision: string;
    indexPath: string;
  }[];
}) => {
  const inputType = `{
    request: Request;
    context: unknown;
    fallback: typeof fetch;
  }`;
  if (manifest.length === 0) {
    return `export const createGeneratedAssetResourceFetch = async ({ fallback }: ${inputType}): Promise<typeof fetch> => fallback;\n`;
  }
  return `import { createGeneratedAssetResourceFetch as createRuntimeFetch } from "@webstudio-is/asset-resource/runtime";

const deploymentId = ${JSON.stringify(deploymentId)};
const manifest = ${JSON.stringify(manifest, null, 2)};

export const createGeneratedAssetResourceFetch = ({ request, context, fallback }: ${inputType}) =>
  createRuntimeFetch({ request, context, deploymentId, manifest, fallback });
`;
};

export const materializeAssetResourceIndexes = async ({
  snapshots,
  publicDirectory,
  generatedDirectory,
  deploymentId,
}: {
  snapshots: NonNullable<PublishedProjectBundle["assetResourceIndexes"]>;
  publicDirectory: string;
  generatedDirectory: string;
  deploymentId: string;
}) => {
  const targetDirectory = join(publicDirectory, "resource-indexes");
  await rm(targetDirectory, { recursive: true, force: true });
  await createFolderIfNotExists(targetDirectory);
  const manifest = snapshots.map(({ resourceId, revision, index }) => {
    if (
      resourceId !== index.resourceId ||
      revision !== index.integrity.checksum
    ) {
      throw new Error("Published asset resource snapshot identity is invalid");
    }
    const indexPath = getResourceIndexPublicPath(resourceId, revision);
    return {
      resourceId,
      revision,
      queryHash: index.queryHash,
      assetRevision: index.assetRevision,
      indexPath,
      index,
    };
  });
  for (const { indexPath, index } of manifest) {
    await writeFile(
      join(publicDirectory, indexPath.slice(1)),
      JSON.stringify(index),
      "utf8"
    );
  }
  await writeFile(
    join(generatedDirectory, "$resources.asset-query-manifest.ts"),
    `export const assetQueryDeploymentId = ${JSON.stringify(
      deploymentId
    )};\nexport const assetQueryManifest = ${JSON.stringify(
      manifest.map(({ index: _index, ...entry }) => entry),
      null,
      2
    )};\n`,
    "utf8"
  );
  await writeFile(
    join(generatedDirectory, "$resources.asset-query-runtime.ts"),
    generateAssetQueryRuntimeModule({
      deploymentId,
      manifest: manifest.map(({ index: _index, ...entry }) => entry),
    }),
    "utf8"
  );
};

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
  let framework;
  if (options.template.includes("ssg")) {
    framework = await createVikeSsgFramework({
      preserveTemplates: preserveRouteTemplates,
    });
  } else if (options.template.includes("react-router")) {
    framework = await createReactRouterFramework({
      preserveTemplates: preserveRouteTemplates,
    });
  } else {
    framework = await createRemixFramework({
      preserveTemplates: preserveRouteTemplates,
    });
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
    throw new Error(
      `Project bundle is invalid, please make sure the project is synced. Invalid fields: ${formatZodIssues(
        parsedSiteData.error.issues,
        loadedSiteData
      )}`
    );
  }
  const siteData = parsedSiteData.data;

  const usedMetas = new Map<Instance["component"], WsComponentMeta>(
    Object.entries(coreMetas)
  );
  const pages = migratePages(siteData.build.pages);
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

  for (const page of generatedPages) {
    const instanceMap = new Map(siteData.build.instances);
    const pageInstanceSet = findTreeInstanceIds(
      instanceMap,
      page.rootInstanceId
    );
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

    // Extract background SVGs and Font assets
    const styleSourceSelections = siteData.build?.styleSourceSelections ?? [];
    const pageStyleSourceIds = new Set(
      styleSourceSelections
        .filter(([, { instanceId }]) => pageInstanceSet.has(instanceId))
        .map(([, { values }]) => values)
        .flat()
    );

    const pageStyles =
      siteData.build?.styles
        ?.filter(([, { styleSourceId }]) =>
          pageStyleSourceIds.has(styleSourceId)
        )
        .map(([, style]) => style) ?? [];

    // Extract fonts
    const pageFontFamilies = collectFontFamiliesFromStyleDecls(pageStyles);

    const pageFontAssets = siteData.assets
      .filter((asset) => asset.type === "font")
      .filter((fontAsset) => pageFontFamilies.has(fontAsset.meta.family))
      .map((asset) => asset.name);

    fontAssetsByPage[page.id] = pageFontAssets;

    // Extract background images
    // backgroundImage => "value.type=="layers" => value.type == "image" => .value (assetId)
    const backgroundImageAssetIdSet = new Set(
      pageStyles
        .filter(({ property }) => property === "backgroundImage")
        .map(({ value }) =>
          value.type === "layers"
            ? value.value.map((layer) =>
                layer.type === "image"
                  ? layer.value.type === "asset"
                    ? layer.value.value
                    : undefined
                  : undefined
              )
            : undefined
        )
        .flat()
        .filter(<T>(value: T): value is NonNullable<T> => value !== undefined)
    );

    const backgroundImageAssets = siteData.assets
      .filter((asset) => asset.type === "image")
      .filter((imageAsset) => backgroundImageAssetIdSet.has(imageAsset.id))
      .map((asset) => asset.name);

    backgroundImageAssetsByPage[page.id] = backgroundImageAssets;
  }

  if (options.assets === true) {
    const assetOrigin = siteData.origin;

    if (!assetOrigin) {
      console.warn("Warning: Asset origin is not defined in project bundle.");
    }
  }

  const assets = new Map(siteData.assets.map((asset) => [asset.id, asset]));

  const { cssText, classes } = generateCss({
    instances: new Map(siteData.build.instances),
    props: new Map(siteData.build.props),
    assets,
    breakpoints: new Map(siteData.build?.breakpoints),
    styles: new Map(siteData.build?.styles),
    styleSourceSelections: new Map(siteData.build?.styleSourceSelections),
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

    // generate component imports
    // Map<importSource, Map<id, importSpecifier>>
    const imports = new Map<string, Map<string, string>>();
    for (const instance of instances.values()) {
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

    const pageFontAssets = fontAssetsByPage[page.id];
    const pageBackgroundImageAssets = backgroundImageAssetsByPage[page.id];

    const props = new Map(pageData.build.props);
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
      dataSources,
      classesMap: classes,
      metas: usedMetas,
      tagsOverrides: framework.tags,
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
      ${importsString}

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
      indexes: siteData.assetResourceIndexes,
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

  await writeGeneratedFile(
    join(generatedDir, "$resources.sitemap.xml.ts"),
    `
      export const sitemap = ${JSON.stringify(
        getStaticSiteMapXml(pages, siteData.build.updatedAt),
        null,
        2
      )};
    `
  );

  await materializeAssetResourceIndexes({
    snapshots: siteData.assetResourceIndexes ?? [],
    publicDirectory: join(buildRoot, "public"),
    generatedDirectory: generatedDir,
    deploymentId: siteData.build.id,
  });

  // Generate assets resource file.
  // Use a placeholder origin to preserve runtime metadata before overriding the
  // builder-only URL with the generated project's local asset URL.
  const assetsById = Object.fromEntries(
    siteData.assets.map((asset) => [
      asset.id,
      {
        ...toRuntimeAsset(asset, "https://placeholder.local"),
        // Generated projects serve materialized assets from the template's
        // asset base; the /cgi routes only exist in the live builder.
        url: `${assetBaseUrl}${asset.name}`,
      },
    ])
  );

  await writeGeneratedFile(
    join(generatedDir, "$resources.assets.ts"),
    `
    export const assets = ${JSON.stringify(assetsById, null, 2)};
    `
  );

  await writeGeneratedFile(
    join(generatedDir, "$resources.redirects.ts"),
    generateRedirectsModule(pages.redirects)
  );

  if (pages.redirects !== undefined && pages.redirects.length > 0) {
    await writeGeneratedFile(
      join(routesDir, "$.tsx"),
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
    const requiredContentRefs = getRequiredAssetResourceContentRefs({
      snapshots: siteData.assetResourceIndexes ?? [],
      resources: siteData.build.resources,
    });
    const requiredAssets: Asset[] = [];
    const bestEffortAssets: Asset[] = [];
    for (const asset of siteData.assets) {
      if (requiredContentRefs.delete(asset.name)) {
        requiredAssets.push(asset);
      } else {
        bestEffortAssets.push(asset);
      }
    }
    if (requiredContentRefs.size > 0) {
      throw new Error(
        `Published asset query indexes reference missing assets: ${[
          ...requiredContentRefs,
        ]
          .sort()
          .join(", ")}`
      );
    }
    await materializeAssetFiles({
      assets: requiredAssets,
      origin: siteData.origin || "",
      sourceAssetsDirectory: join(buildRoot, LOCAL_ASSETS_DIR),
      targetAssetsDirectory: join(buildRoot, "public", assetBaseUrl),
    });
    await materializeAssetFiles({
      assets: bestEffortAssets,
      continueOnError: true,
      origin: siteData.origin || "",
      sourceAssetsDirectory: join(buildRoot, LOCAL_ASSETS_DIR),
      targetAssetsDirectory: join(buildRoot, "public", assetBaseUrl),
    });
    downloading.stop("Downloaded assets");
  }

  feedback.step("Build finished");
};
