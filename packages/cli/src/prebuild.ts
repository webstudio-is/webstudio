import { basename, dirname, join, normalize, relative } from "node:path";
import { createWriteStream, existsSync } from "node:fs";
import {
  rm,
  access,
  rename,
  cp,
  readFile,
  writeFile,
  readdir,
} from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { cwd, exit } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import pLimit from "p-limit";
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
} from "@webstudio-is/sdk";
import {
  createScope,
  findTreeInstanceIds,
  getPagePath,
  parseComponentName,
  generateResources,
  generatePageMeta,
  getStaticSiteMapXml,
  replaceFormActionsWithResources,
  isCoreComponent,
  coreMetas,
  SYSTEM_VARIABLE_ID,
  generateCss,
  ROOT_INSTANCE_ID,
} from "@webstudio-is/sdk";
import type { Data } from "@webstudio-is/http-client";
import { LOCAL_DATA_FILE } from "./config";
import {
  createFileIfNotExists,
  createFolderIfNotExists,
  loadJSONFile,
} from "./fs-utils";
import type * as sharedConstants from "../templates/defaults/app/constants.mjs";
import { htmlToJsx } from "./html-to-jsx";
import { createFramework as createRemixFramework } from "./framework-remix";
import { createFramework as createReactRouterFramework } from "./framework-react-router";
import { createFramework as createVikeSsgFramework } from "./framework-vike-ssg";

const limit = pLimit(10);

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

export const downloadAsset = async (
  url: string,
  name: string,
  assetBaseUrl: string
) => {
  const assetPath = join("public", assetBaseUrl, name);
  // fs.rename cannot be used to move a file to a different mount point or drive
  // Error: EXDEV: cross-device link not permitted
  const tempAssetPath = `${assetPath}.tmp`;

  try {
    await access(assetPath);
  } catch {
    await createFolderIfNotExists(dirname(assetPath));

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }

      const writableStream = createWriteStream(tempAssetPath);
      /*
        We need to cast the response body to a NodeJS.ReadableStream.
        Since the node typings for `@types/node` doesn't add typings for fetch.
        And it inherits types from lib.dom.d.ts
      */
      await pipeline(
        response.body as unknown as NodeJS.ReadableStream,
        writableStream
      );

      await rename(tempAssetPath, assetPath);
    } catch (error) {
      console.error(`Error in downloading file ${name} \n ${error}`);
    }
  }
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

  const constants: typeof sharedConstants = await import(
    pathToFileURL(join(cwd(), "app/constants.mjs")).href
  );

  const { assetBaseUrl } = constants;

  const siteData = await loadJSONFile<
    Data & { user?: { email: string | null } }
  >(LOCAL_DATA_FILE);

  if (siteData === null) {
    throw new Error(
      `Project data is missing, please make sure you the project is synced.`
    );
  }

  // collect all possible component metas
  const metas = new Map<string, WsComponentMeta>();
  const componentSources = new Map<string, string>();
  for (const entry of framework.components) {
    for (const [componentName, meta] of Object.entries(entry.metas)) {
      metas.set(componentName, meta);
      componentSources.set(componentName, entry.source);
    }
  }

  const usedMetas = new Map<Instance["component"], WsComponentMeta>(
    Object.entries(coreMetas)
  );
  const siteDataByPage: SiteDataByPage = {};
  const fontAssetsByPage: Record<Page["id"], string[]> = {};
  const backgroundImageAssetsByPage: Record<Page["id"], string[]> = {};

  for (const page of Object.values(siteData.pages)) {
    const instanceMap = new Map(siteData.build.instances);
    const pageInstanceSet = findTreeInstanceIds(
      instanceMap,
      page.rootInstanceId
    );
    // support global data variables
    pageInstanceSet.add(ROOT_INSTANCE_ID);
    const instances: [Instance["id"], Instance][] =
      siteData.build.instances.filter(([id]) => pageInstanceSet.has(id));
    const dataSources: [DataSource["id"], DataSource][] = [];

    // use whole project props to access id props from other pages
    const normalizedProps = normalizeProps({
      props: siteData.build.props.map(([_id, prop]) => prop),
      assetBaseUrl,
      assets: new Map(siteData.assets.map((asset) => [asset.id, asset])),
      uploadingImageAssets: [],
      pages: siteData.build.pages,
      source: "prebuild",
    });

    const props: [Prop["id"], Prop][] = [];
    for (const prop of normalizedProps) {
      if (pageInstanceSet.has(prop.instanceId)) {
        props.push([prop.id, prop]);
      }
    }

    const resourceIds = new Set<Resource["id"]>();
    for (const [dataSourceId, dataSource] of siteData.build.dataSources) {
      if (
        dataSource.scopeInstanceId === undefined ||
        pageInstanceSet.has(dataSource.scopeInstanceId)
      ) {
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
      pages: siteData.pages,
      page,
      assets: siteData.assets,
    };

    for (const [_instanceId, instance] of instances) {
      const meta = metas.get(instance.component);
      if (meta) {
        usedMetas.set(instance.component, meta);
      }
    }

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

  const assetsToDownload: Promise<void>[] = [];

  if (options.assets === true) {
    const assetOrigin = siteData.origin;

    for (const asset of siteData.assets) {
      if (asset.type === "image") {
        assetsToDownload.push(
          limit(() =>
            downloadAsset(
              `${assetOrigin}/cgi/image/${asset.name}?format=raw`,
              asset.name,
              assetBaseUrl
            )
          )
        );
      }

      if (asset.type === "font") {
        assetsToDownload.push(
          limit(() =>
            downloadAsset(
              `${assetOrigin}/cgi/asset/${asset.name}`,
              asset.name,
              assetBaseUrl
            )
          )
        );
      }
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
    atomic: siteData.build.pages.compiler?.atomicStyles ?? true,
  });

  await createFileIfNotExists(join(generatedDir, "index.css"), cssText);

  for (const page of Object.values(siteData.pages)) {
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

    const pageComponents = new Set<Instance["component"]>();
    for (const instance of instances.values()) {
      pageComponents.add(instance.component);
    }
    const namespaces = new Map<
      string,
      Set<[shortName: string, componentName: string]>
    >();
    for (const component of pageComponents) {
      const namespace = componentSources.get(component);
      if (namespace === undefined) {
        continue;
      }
      if (namespaces.has(namespace) === false) {
        namespaces.set(
          namespace,
          new Set<[shortName: string, componentName: string]>()
        );
      }
      const [_namespace, shortName] = parseComponentName(component);
      namespaces.get(namespace)?.add([shortName, component]);
    }

    let componentImports = "";
    for (const [namespace, componentsSet] of namespaces.entries()) {
      const specifiers = Array.from(componentsSet)
        .map(
          ([shortName, component]) =>
            `${shortName} as ${scope.getName(component, shortName)}`
        )
        .join(", ");
      componentImports += `import { ${specifiers} } from "${namespace}";\n`;
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
    });

    const projectMeta = siteData.build.pages.meta;
    const contactEmail: undefined | string =
      // fallback to user email when contact email is empty string
      projectMeta?.contactEmail || siteData.user?.email || undefined;
    const favIconAsset = assets.get(projectMeta?.faviconAssetId ?? "")?.name;

    const pagePath = getPagePath(page.id, siteData.build.pages);

    // MARK: - TODO: XML GENERATION
    const pageExports = `/* eslint-disable */
      /* This is a auto generated file for building the project */ \n

      import { Fragment, useState } from "react";
      import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
      ${componentImports}

      export const siteName = ${JSON.stringify(projectMeta?.siteName)};

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

      export const projectId = "${siteData.build.projectId}";

      export const contactEmail = ${JSON.stringify(contactEmail)};
    `;

    const generatedBasename = generateRemixRoute(pagePath);

    const clientFile = join(generatedDir, `${generatedBasename}.tsx`);
    await createFileIfNotExists(clientFile, pageExports);

    const serverFile = join(generatedDir, `${generatedBasename}.server.tsx`);
    await createFileIfNotExists(serverFile, serverExports);

    const getTemplates =
      documentType === "html" ? framework.html : framework.xml;
    for (const { file, template } of getTemplates({ pagePath })) {
      const content = template
        .replaceAll("__CONSTANTS__", importFrom("./app/constants.mjs", file))
        .replaceAll(
          "__SITEMAP__",
          importFrom(`./app/__generated__/$resources.sitemap.xml`, file)
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
        getStaticSiteMapXml(siteData.build.pages, siteData.build.updatedAt),
        null,
        2
      )};
    `
  );

  const redirects = siteData.build.pages?.redirects;
  if (redirects !== undefined && redirects.length > 0) {
    for (const redirect of redirects) {
      const generatedBasename = generateRemixRoute(redirect.old);
      await createFileIfNotExists(
        join(generatedDir, `${generatedBasename}.ts`),
        `
        export const url = "${redirect.new}";
        export const status = ${redirect.status ?? 301};
        `
      );

      for (const { file, template } of framework.redirect({
        pagePath: redirect.old,
      })) {
        const content = template.replaceAll(
          "__REDIRECT__",
          importFrom(`./app/__generated__/${generatedBasename}`, file)
        );
        await createFileIfNotExists(file, content);
      }
    }
  }

  if (assetsToDownload.length > 0) {
    const downloading = spinner();
    downloading.start("Downloading fonts and images");
    await Promise.all(assetsToDownload);
    downloading.stop("Downloaded fonts and images");
  }

  log.step("Build finished");
};
