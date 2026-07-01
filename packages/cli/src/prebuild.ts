import { basename, dirname, join, normalize, relative } from "node:path";
import { existsSync } from "node:fs";
import { rm, cp, readFile, writeFile, readdir } from "node:fs/promises";
import { cwd, exit } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  getPagePath,
  getAllPages,
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
} from "@webstudio-is/sdk";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import { publishedProjectBundle } from "@webstudio-is/protocol";
import { createAuthConfigResources, LOCAL_AUTH_FILE } from "./auth-config";
import { LOCAL_DATA_FILE } from "./config";
import {
  createFileIfNotExists,
  createFolderIfNotExists,
  loadJSONFile,
} from "./fs-utils";
import { htmlToJsx } from "./html-to-jsx";
import { compareMedia } from "@webstudio-is/css-engine";
import { materializeAssetFiles } from "./asset-files";
import { formatZodIssues } from "./zod-utils";

const createRemixFramework = async () =>
  (await import("./framework-remix")).createFramework();

const createReactRouterFramework = async () =>
  (await import("./framework-react-router")).createFramework();

const createVikeSsgFramework = async () =>
  (await import("./framework-vike-ssg")).createFramework();

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

const writeWsAuthResources = async (generatedDir: string, pages: Pages) => {
  const { content, module } = createAuthConfigResources(pages);
  await createFolderIfNotExists(dirname(LOCAL_AUTH_FILE));
  await writeFile(LOCAL_AUTH_FILE, content);
  await createFileIfNotExists(
    join(generatedDir, "$resources.wsauth.server.ts"),
    module
  );
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
    import { type LoaderFunctionArgs } from ${JSON.stringify(loaderFunctionArgs)};
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
}) => {
  if (options.template.length === 0) {
    log.error(
      `Template is not provided\nPlease check webstudio --help for more details`
    );
    exit(1);
  }

  for (const template of options.template) {
    // Template is local user template
    if (template.startsWith(".") || template.startsWith("/")) {
      continue;
    }

    if ((await isCliTemplate(template)) === false) {
      log.error(
        `Template ${options.template} is not available\nPlease check webstudio --help for more details`
      );
      exit(1);
    }
  }

  log.step("Scaffolding the project files");

  const appRoot = "app";

  const generatedDir = join(appRoot, "__generated__");
  await rm(generatedDir, { recursive: true, force: true });

  const routesDir = join(appRoot, "routes");
  await rm(routesDir, { recursive: true, force: true });

  // force npm to install with not matching peer dependencies
  await writeFile(join(cwd(), ".npmrc"), npmrc);

  for (const template of options.template) {
    await copyTemplates(template);
  }

  let framework;
  if (options.template.includes("ssg")) {
    framework = await createVikeSsgFramework();
  } else if (options.template.includes("react-router")) {
    framework = await createReactRouterFramework();
  } else {
    framework = await createRemixFramework();
  }

  const constants: typeof import("../templates/defaults/app/constants.mjs") =
    await import(pathToFileURL(join(cwd(), "app/constants.mjs")).href);

  const { assetBaseUrl } = constants;

  const loadedSiteData = await loadJSONFile<unknown>(LOCAL_DATA_FILE);

  if (loadedSiteData === null) {
    throw new Error(
      `Project bundle is missing, please make sure the project is synced.`
    );
  }
  const parsedSiteData = publishedProjectBundle.safeParse(loadedSiteData);
  if (parsedSiteData.success === false) {
    throw new Error(
      `Project bundle is invalid, please make sure the project is synced. Invalid fields: ${formatZodIssues(parsedSiteData.error.issues)}`
    );
  }
  const siteData = parsedSiteData.data;

  const usedMetas = new Map<Instance["component"], WsComponentMeta>(
    Object.entries(coreMetas)
  );
  const pages = migratePages(siteData.build.pages);
  const allPages = getAllPages(pages);
  await writeWsAuthResources(generatedDir, pages);
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

  for (const page of allPages) {
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
      pages: allPages,
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

    const pageStyles = siteData.build?.styles?.filter(([, { styleSourceId }]) =>
      pageStyleSourceIds.has(styleSourceId)
    );

    // Extract fonts
    const pageFontFamilySet = new Set(
      pageStyles
        .filter(([, { property }]) => property === "fontFamily")
        .map(([, { value }]) =>
          value.type === "fontFamily" ? value.value : undefined
        )
        .flat()
        .filter(<T>(value: T): value is NonNullable<T> => value !== undefined)
    );

    const pageFontAssets = siteData.assets
      .filter((asset) => asset.type === "font")
      .filter((fontAsset) => pageFontFamilySet.has(fontAsset.meta.family))
      .map((asset) => asset.name);

    fontAssetsByPage[page.id] = pageFontAssets;

    // Extract background images
    // backgroundImage => "value.type=="layers" => value.type == "image" => .value (assetId)
    const backgroundImageAssetIdSet = new Set(
      pageStyles
        .filter(([, { property }]) => property === "backgroundImage")
        .map(([, { value }]) =>
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
    atomic: pages.compiler?.atomicStyles ?? true,
  });

  await createFileIfNotExists(join(generatedDir, "index.css"), cssText);

  for (const page of allPages) {
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

    const projectMeta = pages.meta;
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

      export const projectDomain = ${JSON.stringify(siteData.projectDomain)};

      export const lastPublished = "${new Date(siteData.build.createdAt).toISOString()}";

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
              return (<>${projectMeta?.code ? htmlToJsx(projectMeta.code) : ""}</>);
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
    await createFileIfNotExists(clientFile, pageExports);

    const serverFile = join(generatedDir, `${generatedBasename}.server.tsx`);
    await createFileIfNotExists(serverFile, serverExports);

    const getTemplates = framework[documentType];
    for (const { file, template } of getTemplates({ pagePath })) {
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
      await createFileIfNotExists(file, content);
    }
  }

  // MARK: - Default sitemap.xml
  for (const { file, template } of framework.defaultSitemap()) {
    const content = template.replaceAll(
      "__SITEMAP__",
      importFrom(`./app/__generated__/$resources.sitemap.xml`, file)
    );
    await createFileIfNotExists(file, content);
  }

  await createFileIfNotExists(
    join(generatedDir, "$resources.sitemap.xml.ts"),
    `
      export const sitemap = ${JSON.stringify(
        getStaticSiteMapXml(pages, siteData.build.updatedAt),
        null,
        2
      )};
    `
  );

  // Generate assets resource file
  // Assets use /cgi/ endpoints on both builder and published sites
  // Use a placeholder origin for URL construction, result will be relative paths
  const assetsById = Object.fromEntries(
    siteData.assets.map((asset) => [
      asset.id,
      toRuntimeAsset(asset, "https://placeholder.local"),
    ])
  );

  await createFileIfNotExists(
    join(generatedDir, "$resources.assets.ts"),
    `
    export const assets = ${JSON.stringify(assetsById, null, 2)};
    `
  );

  await createFileIfNotExists(
    join(generatedDir, "$resources.redirects.ts"),
    generateRedirectsModule(pages.redirects)
  );

  if (pages.redirects !== undefined && pages.redirects.length > 0) {
    await createFileIfNotExists(
      join(routesDir, "$.tsx"),
      generateRedirectFallbackRoute(
        options.template.includes("react-router") ? "react-router" : "remix"
      )
    );
  }

  if (options.assets === true && siteData.assets.length > 0) {
    const downloading = spinner();
    downloading.start("Downloading fonts and images");
    await materializeAssetFiles({
      assets: siteData.assets,
      continueOnError: true,
      origin: siteData.origin || "",
      targetAssetsDirectory: join("public", assetBaseUrl),
    });
    downloading.stop("Downloaded fonts and images");
  }

  log.step("Build finished");
};
