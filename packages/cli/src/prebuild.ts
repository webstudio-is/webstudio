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
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import pLimit from "p-limit";
import ora from "ora";
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
  collectionComponent,
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
  executeExpression,
  generateFormsProperties,
  generateResourcesLoader,
  generatePageMeta,
} from "@webstudio-is/sdk";
import type { Data } from "@webstudio-is/http-client";
import { createImageLoader } from "@webstudio-is/image";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as remixComponentMetas from "@webstudio-is/sdk-components-react-remix/metas";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";
import { LOCAL_DATA_FILE } from "./config";
import {
  ensureFileInPath,
  ensureFolderExists,
  loadJSONFile,
  isFileExists,
} from "./fs-utils";
import type * as sharedConstants from "~/constants.mjs";
import type { PageData } from "../templates/defaults/__templates__/route-template";

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
    await ensureFolderExists(dirname(assetPath));

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

const mergeJsonFiles = async (sourcePath: string, destinationPath: string) => {
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
    merge(JSON.parse(sourceJson), JSON.parse(destinationJson)),
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
    await mergeJsonFiles(
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
  template?: string[];
}) => {
  if (options.template === undefined) {
    throw new Error(
      `\n Template is not provided \n Please check webstudio --help for more details`
    );
  }

  for (const template of options.template) {
    // default template is always applied no need to check
    if (template === "vanilla") {
      continue;
    }

    // Template is local user template
    if (template.startsWith(".")) {
      continue;
    }

    if ((await isCliTemplate(template)) === false) {
      throw Error(
        `\n Template ${options.template} is not available \n Please check webstudio --help for more details`
      );
    }
  }

  const spinner = ora("Scaffolding the project files");
  spinner.start();

  spinner.text = "Generating files";

  const appRoot = "app";

  const generatedDir = join(appRoot, "__generated__");
  await rm(generatedDir, { recursive: true, force: true });

  const routesDir = join(appRoot, "routes");
  await rm(routesDir, { recursive: true, force: true });

  await copyTemplates();

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
      if (instance.component === collectionComponent) {
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

  const imageAssets: ImageAsset[] = [];
  for (const asset of siteData.assets) {
    if (asset.type === "image") {
      imageAssets.push(asset);
    }
  }

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

  spinner.text = "Generating css file";

  const { cssText, classesMap } = generateCss(
    {
      assets: siteData.assets,
      breakpoints: siteData.build?.breakpoints,
      styles: siteData.build?.styles,
      styleSourceSelections: siteData.build?.styleSourceSelections,
      // pass only used metas to not generate unused preset styles
      componentMetas: projectMetas,
    },
    {
      assetBaseUrl,
      atomic: siteData.build.pages.compiler?.atomicStyles ?? true,
    }
  );

  await ensureFileInPath(join(generatedDir, "index.css"), cssText);

  spinner.text = "Generating routes and pages";

  const routeTemplatePath = normalize(
    join(cwd(), "__templates__", "route-template.tsx")
  );

  const routeFileTemplate = await readFile(routeTemplatePath, "utf8");

  await rm(dirname(routeTemplatePath), { recursive: true });

  for (const [pageId, pageComponents] of Object.entries(componentsByPage)) {
    const scope = createScope([
      // manually maintained list of occupied identifiers
      "useState",
      "Fragment",
      "useResource",
      "PageData",
      "Asset",
      "ProjectMeta",
      "fontAssets",
      "pageData",
      "user",
      "projectId",
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
    for (const [namespace, componentsSet] of namespaces.entries()) {
      const specifiers = Array.from(componentsSet)
        .map(
          ([shortName, component]) =>
            `${shortName} as ${scope.getName(component, shortName)}`
        )
        .join(", ");
      componentImports += `import { ${specifiers} } from "${namespace}";\n`;
    }

    const pageData = siteDataByPage[pageId];
    const pageFontAssets = fontAssetsByPage[pageId];
    const pageBackgroundImageAssets = backgroundImageAssetsByPage[pageId];
    // serialize data only used in runtime
    const renderedPageData: PageData = {
      project: siteData.build.pages.meta,
    };

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

    const pageExports = `/* eslint-disable */
/* This is a auto generated file for building the project */ \n
import { Fragment, useState } from "react";
import type { Asset, FontAsset, ImageAsset, ProjectMeta } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
${componentImports}
import type { PageData } from "~/routes/_index";
export const imageAssets: ImageAsset[] = ${JSON.stringify(imageAssets)}

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = ${JSON.stringify(pageFontAssets)}

export const pageBackgroundImageAssets: ImageAsset[] = ${JSON.stringify(
      pageBackgroundImageAssets
    )}

export const pageData: PageData = ${JSON.stringify(renderedPageData)};
export const user: { email: string | null } | undefined = ${JSON.stringify(
      siteData.user
    )};
export const projectId = "${siteData.build.projectId}";

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
`;

    /*
      The _index is mandatory.
      Let's say there is a route /test.one.tsx and then there is a /test.tsx route.
      Remix doesn't pick the /test.tsx by default unless we mention the _index at the end.

      Or else it picks the first route that matches the /test as a layout and not a independent route.
      So, we need to mark the pages as _index at the end. So deep nested routes works as expected.

      Details:
      https://remix.run/docs/en/main/file-conventions/route-files-v2#nested-urls-without-layout-nesting
    */

    const pagePath = getPagePath(pageData.page.id, siteData.build.pages);
    const remixRoute = generateRemixRoute(pagePath);
    const fileName = `${remixRoute}.tsx`;

    const routeFileContent = routeFileTemplate
      .replace(
        /".*\/__generated__\/_index"/,
        `"../__generated__/${remixRoute}"`
      )
      .replace(
        /".*\/__generated__\/_index.server"/,
        `"../__generated__/${remixRoute}.server"`
      );

    await ensureFileInPath(join(routesDir, fileName), routeFileContent);
    await ensureFileInPath(join(generatedDir, fileName), pageExports);

    await ensureFileInPath(
      join(generatedDir, `${remixRoute}.server.tsx`),
      serverExports
    );
  }

  await writeFile(
    join(generatedDir, "[sitemap.xml].ts"),
    `
      export const sitemap = ${JSON.stringify(
        {
          pages: siteData.pages
            // ignore pages with excludePageFromSearch bound to variables
            // because there is no data from cms available at build time
            .filter(
              (page) =>
                executeExpression(page.meta.excludePageFromSearch) !== true
            )
            .map((page) => ({
              path: page.path,
              lastModified: siteData.build.updatedAt,
            })),
        },
        null,
        2
      )};
    `
  );

  const redirects = siteData.build.pages?.redirects;
  if (redirects !== undefined && redirects.length > 0) {
    spinner.text = "Generating redirects";

    for (const redirect of redirects) {
      const redirectPagePath = generateRemixRoute(redirect.old);
      const redirectFileName = `${redirectPagePath}.ts`;

      const content = `import { type LoaderArgs, redirect } from "@remix-run/server-runtime";

export const loader = (arg: LoaderArgs) => {
  return redirect("${redirect.new}", ${redirect.status ?? 301});
};
`;

      await ensureFileInPath(join(routesDir, redirectFileName), content);
    }
  }

  spinner.text = "Downloading fonts and images";
  await Promise.all(assetsToDownload);

  spinner.succeed("Build finished");
};
