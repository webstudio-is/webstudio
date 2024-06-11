import { basename, dirname, join, normalize } from "node:path";
import { createWriteStream } from "node:fs";
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
  generateCss,
  generateWebstudioComponent,
  getIndexesWithinAncestors,
  namespaceMeta,
  type Params,
  type WsComponentMeta,
  normalizeProps,
  generateRemixRoute,
  generateRemixParams,
  isCoreComponent,
} from "@webstudio-is/react-sdk";
import type {
  Instance,
  Prop,
  Page,
  DataSource,
  Deployment,
  Asset,
  FontAsset,
  ImageAsset,
  Resource,
} from "@webstudio-is/sdk";
import {
  createScope,
  findTreeInstanceIds,
  getPagePath,
  parseComponentName,
  generateFormsProperties,
  generateResourcesLoader,
  generatePageMeta,
  getStaticSiteMapXml,
} from "@webstudio-is/sdk";
import type { Data } from "@webstudio-is/http-client";
import { createImageLoader } from "@webstudio-is/image";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as remixComponentMetas from "@webstudio-is/sdk-components-react-remix/metas";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";
import { LOCAL_DATA_FILE } from "./config";
import {
  createFileIfNotExists,
  createFolderIfNotExists,
  loadJSONFile,
  isFileExists,
} from "./fs-utils";
import type * as sharedConstants from "../templates/defaults/app/constants.mjs";
import { htmlToJsx } from "./html-to-jsx";

const limit = pLimit(10);

type ComponentsByPage = {
  [id: Page["id"]]: Set<string>;
};

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
    merge(JSON.parse(destinationJson), JSON.parse(sourceJson)),
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

const copyTemplates = async (template: string = "defaults") => {
  const templatePath = await getTemplatePath(template);

  await cp(templatePath, cwd(), {
    recursive: true,
    filter: (source) => {
      return basename(source) !== "package.json";
    },
  });

  if ((await isFileExists(join(templatePath, "package.json"))) === true) {
    await mergeJsonInto(
      join(templatePath, "package.json"),
      join(cwd(), "package.json")
    );
  }
};

export const prebuild = async (options: {
  /**
   * Use preview (opensource) version of the project
   **/
  preview: boolean;
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
    // default template is always applied no need to check
    if (template === "vanilla") {
      continue;
    }

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

  await copyTemplates();

  // force npm to install with not matching peer dependencies
  await writeFile(join(cwd(), ".npmrc"), "force=true");

  for (const template of options.template) {
    // default template is already applied no need to copy twice
    if (template === "vanilla") {
      continue;
    }

    await copyTemplates(template);
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

  const domain = siteData.build.deployment?.projectDomain;
  if (domain === undefined) {
    throw new Error(`Project domain is missing from the project data`);
  }

  const radixComponentNamespacedMetas = Object.entries(
    radixComponentMetas
  ).reduce(
    (r, [name, meta]) => {
      const namespace = "@webstudio-is/sdk-components-react-radix";
      r[`${namespace}:${name}`] = namespaceMeta(
        meta,
        namespace,
        new Set(Object.keys(radixComponentMetas))
      );
      return r;
    },
    {} as Record<string, WsComponentMeta>
  );

  const metas = new Map(
    Object.entries({
      ...baseComponentMetas,
      ...radixComponentNamespacedMetas,
      ...remixComponentMetas,
    })
  );

  const projectMetas = new Map<Instance["component"], WsComponentMeta>();
  const componentsByPage: ComponentsByPage = {};
  const siteDataByPage: SiteDataByPage = {};
  const fontAssetsByPage: Record<Page["id"], FontAsset[]> = {};
  const backgroundImageAssetsByPage: Record<Page["id"], ImageAsset[]> = {};

  for (const page of Object.values(siteData.pages)) {
    const instanceMap = new Map(siteData.build.instances);
    const pageInstanceSet = findTreeInstanceIds(
      instanceMap,
      page.rootInstanceId
    );
    const instances: [Instance["id"], Instance][] =
      siteData.build.instances.filter(([id]) => pageInstanceSet.has(id));
    const dataSources: [DataSource["id"], DataSource][] = [];

    // use whole project props to access id props from other pages
    const normalizedProps = normalizeProps({
      props: siteData.build.props.map(([_id, prop]) => prop),
      assetBaseUrl,
      assets: new Map(siteData.assets.map((asset) => [asset.id, asset])),
      pages: siteData.build.pages,
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

    componentsByPage[page.id] = new Set();
    for (const [_instanceId, instance] of instances) {
      if (isCoreComponent(instance.component)) {
        continue;
      }
      componentsByPage[page.id].add(instance.component);
      const meta = metas.get(instance.component);
      if (meta) {
        projectMetas.set(instance.component, meta);
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
      .filter((asset): asset is FontAsset => asset.type === "font")
      .filter((fontAsset) => pageFontFamilySet.has(fontAsset.meta.family));

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
      .filter((asset): asset is ImageAsset => asset.type === "image")
      .filter((imageAsset) => backgroundImageAssetIdSet.has(imageAsset.id));

    backgroundImageAssetsByPage[page.id] = backgroundImageAssets;
  }

  const assetsToDownload: Promise<void>[] = [];

  const appDomain = options.preview ? "wstd.work" : "wstd.io";
  const assetBuildUrl = `https://${domain}.${appDomain}/cgi/asset/`;

  const imageLoader = createImageLoader({
    imageBaseUrl: assetBuildUrl,
  });

  if (options.assets === true) {
    for (const asset of siteData.assets) {
      if (asset.type === "image") {
        const imageSrc = imageLoader({
          src: asset.name,
          format: "raw",
        });

        assetsToDownload.push(
          limit(() => downloadAsset(imageSrc, asset.name, assetBaseUrl))
        );
      }

      if (asset.type === "font") {
        assetsToDownload.push(
          limit(() =>
            downloadAsset(
              `${assetBuildUrl}${asset.name}`,
              asset.name,
              assetBaseUrl
            )
          )
        );
      }
    }
  }

  const assets = new Map(siteData.assets.map((asset) => [asset.id, asset]));

  const { cssText, classesMap } = generateCss({
    instances: new Map(siteData.build.instances),
    props: new Map(siteData.build.props),
    assets,
    breakpoints: new Map(siteData.build?.breakpoints),
    styles: new Map(siteData.build?.styles),
    styleSourceSelections: new Map(siteData.build?.styleSourceSelections),
    // pass only used metas to not generate unused preset styles
    componentMetas: projectMetas,
    assetBaseUrl,
    atomic: siteData.build.pages.compiler?.atomicStyles ?? true,
  });

  await createFileIfNotExists(join(generatedDir, "index.css"), cssText);

  // MARK: - Route templates read
  const routeTemplatesDir = join(cwd(), "app/route-templates");

  const routeTemplatePath = normalize(join(routeTemplatesDir, "html.tsx"));
  const routeXmlTemplatePath = normalize(join(routeTemplatesDir, "xml.tsx"));
  const defaultSiteMapXmlPath = normalize(
    join(routeTemplatesDir, "default-sitemap.tsx")
  );

  const routeFileTemplate = await readFile(routeTemplatePath, "utf8");
  const routeXmlFileTemplate = await readFile(routeXmlTemplatePath, "utf8");
  const defaultSiteMapTemplate = await readFile(defaultSiteMapXmlPath, "utf8");
  await rm(routeTemplatesDir, { recursive: true, force: true });

  for (const [pageId, pageComponents] of Object.entries(componentsByPage)) {
    const scope = createScope([
      // manually maintained list of occupied identifiers
      "useState",
      "Fragment",
      "useResource",
      "Page",
      "_props",
    ]);

    const namespaces = new Map<
      string,
      Set<[shortName: string, componentName: string]>
    >();

    const BASE_NAMESPACE = "@webstudio-is/sdk-components-react";
    const REMIX_NAMESPACE = "@webstudio-is/sdk-components-react-remix";

    for (const component of pageComponents) {
      const parsed = parseComponentName(component);
      let [namespace] = parsed;
      const [_namespace, shortName] = parsed;

      if (namespace === undefined) {
        // use base as fallback namespace and consider remix overrides
        if (shortName in remixComponentMetas) {
          namespace = REMIX_NAMESPACE;
        } else {
          namespace = BASE_NAMESPACE;
        }
      }

      if (namespaces.has(namespace) === false) {
        namespaces.set(
          namespace,
          new Set<[shortName: string, componentName: string]>()
        );
      }
      namespaces.get(namespace)?.add([shortName, component]);
    }

    let componentImports = "";
    let xmlPresentationComponents = "";

    const pageData = siteDataByPage[pageId];
    const documentType = pageData.page.meta.documentType ?? "html";

    for (const [namespace, componentsSet] of namespaces.entries()) {
      switch (documentType) {
        case "html":
          {
            const specifiers = Array.from(componentsSet)
              .map(
                ([shortName, component]) =>
                  `${shortName} as ${scope.getName(component, shortName)}`
              )
              .join(", ");
            componentImports += `import { ${specifiers} } from "${namespace}";\n`;
          }
          break;

        case "xml":
          {
            // In case of xml it's the only component we are supporting
            componentImports = `import { XmlNode } from "@webstudio-is/sdk-components-react";\n`;

            // Passthrough (render children) for Body, do not render all other components
            xmlPresentationComponents += Array.from(componentsSet)
              .map(([shortName, component]) =>
                scope.getName(component, shortName)
              )
              .filter((scopedName) => scopedName !== "XmlNode")
              .map((scopedName) =>
                scopedName === "Body"
                  ? `const ${scopedName} = (props: any) => props.children;`
                  : `const ${scopedName} = () => null;`
              )
              .join("\n");
          }
          break;
        default: {
          documentType satisfies never;
        }
      }
    }

    const pageFontAssets = fontAssetsByPage[pageId];
    const pageBackgroundImageAssets = backgroundImageAssetsByPage[pageId];

    const rootInstanceId = pageData.page.rootInstanceId;
    const instances = new Map(pageData.build.instances);
    const props = new Map(pageData.build.props);
    const dataSources = new Map(pageData.build.dataSources);
    const resources = new Map(pageData.build.resources);
    const pageComponent = generateWebstudioComponent({
      scope,
      name: "Page",
      rootInstanceId,
      parameters: [
        {
          id: `system`,
          instanceId: "",
          name: "system",
          type: "parameter",
          value: pageData.page.systemDataSourceId ?? "",
        },
      ],
      instances,
      props,
      dataSources,
      classesMap,
      indexesWithinAncestors: getIndexesWithinAncestors(
        projectMetas,
        instances,
        [rootInstanceId]
      ),
    });

    const projectMeta = siteData.build.pages.meta;
    const contactEmail: undefined | string =
      // fallback to user email when contact email is empty string
      projectMeta?.contactEmail || siteData.user?.email || undefined;
    const pageMeta = pageData.page.meta;
    const favIconAsset = assets.get(projectMeta?.faviconAssetId ?? "");
    const socialImageAsset = assets.get(pageMeta.socialImageAssetId ?? "");

    const pagePath = getPagePath(pageData.page.id, siteData.build.pages);
    const remixRoute = generateRemixRoute(pagePath);
    const fileName = `${remixRoute}.tsx`;

    // MARK: - TODO: XML GENERATION
    const pageExports = `/* eslint-disable */
      /* This is a auto generated file for building the project */ \n

      import { Fragment, useState } from "react";
      import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
      import { useResource } from "@webstudio-is/react-sdk";
      ${componentImports}

      export const siteName = ${JSON.stringify(projectMeta?.siteName)};

      export const favIconAsset: ImageAsset | undefined =
        ${JSON.stringify(favIconAsset)};

      export const socialImageAsset: ImageAsset | undefined =
        ${JSON.stringify(socialImageAsset)};

      // Font assets on current page (can be preloaded)
      export const pageFontAssets: FontAsset[] =
        ${JSON.stringify(pageFontAssets)}

      export const pageBackgroundImageAssets: ImageAsset[] =
        ${JSON.stringify(pageBackgroundImageAssets)}

      ${
        remixRoute === "_index"
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

      ${xmlPresentationComponents}

      ${pageComponent}

      export { Page }
    `;

    const serverExports = `/* eslint-disable */
      /* This is a auto generated file for building the project */ \n

      import type { PageMeta } from "@webstudio-is/sdk";
      ${generateResourcesLoader({
        scope,
        page: pageData.page,
        dataSources,
        resources,
      })}

      ${generatePageMeta({
        globalScope: scope,
        page: pageData.page,
        dataSources,
      })}

      ${generateFormsProperties(props)}

      ${generateRemixParams(pageData.page.path)}

      export const projectId = "${siteData.build.projectId}";

      export const contactEmail = ${JSON.stringify(contactEmail)};
    `;

    const routeFileContent = (
      documentType === "html" ? routeFileTemplate : routeXmlFileTemplate
    )
      .replace(
        /".*\/__generated__\/_index"/,
        `"../__generated__/${remixRoute}"`
      )
      .replace(
        /".*\/__generated__\/_index.server"/,
        `"../__generated__/${remixRoute}.server"`
      );

    await createFileIfNotExists(join(routesDir, fileName), routeFileContent);

    await createFileIfNotExists(join(generatedDir, fileName), pageExports);

    await createFileIfNotExists(
      join(generatedDir, `${remixRoute}.server.tsx`),
      serverExports
    );
  }

  // MARK: - Default sitemap.xml
  await createFileIfNotExists(
    join(routesDir, "[sitemap.xml]._index.tsx"),
    defaultSiteMapTemplate.replace(/".*\/__generated__\//, `"../__generated__/`)
  );

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
      const redirectPagePath = generateRemixRoute(redirect.old);
      const redirectFileName = `${redirectPagePath}.ts`;

      const content = `import { type LoaderFunctionArgs, redirect } from "@remix-run/server-runtime";

      export const loader = (arg: LoaderFunctionArgs) => {
      return redirect("${redirect.new}", ${redirect.status ?? 301});
      };
      `;

      await createFileIfNotExists(join(routesDir, redirectFileName), content);
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
