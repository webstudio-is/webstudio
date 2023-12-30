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
  generateCssText,
  generateUtilsExport,
  generatePageComponent,
  getIndexesWithinAncestors,
  namespaceMeta,
  type Params,
  type WsComponentMeta,
  normalizeProps,
  generateRemixRoute,
  generateRemixParams,
  generateResourcesLoader,
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
  parseComponentName,
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
import type { PageData } from "../templates/route-template";

const limit = pLimit(10);

type ComponentsByPage = {
  [path: string]: Set<string>;
};

type SiteDataByPage = {
  [path: string]: {
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

const copyTemplates = async (template: string = "defaults") => {
  const currentPath = fileURLToPath(new URL(import.meta.url));

  const templatesPath = (await isCliTemplate(template))
    ? normalize(join(dirname(currentPath), "..", "templates", template))
    : template;

  await cp(templatesPath, cwd(), {
    recursive: true,
    filter: (source) => {
      return basename(source) !== "package.json";
    },
  });

  if ((await isFileExists(join(templatesPath, "package.json"))) === true) {
    await mergeJsonFiles(
      join(templatesPath, "package.json"),
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
  template?: string;
}) => {
  if (options.template === undefined) {
    throw new Error(
      `\n Template is not provided \n Please check webstudio --help for more details`
    );
  }

  if (
    options.template !== "vanilla" &&
    (await isCliTemplate(options.template)) === false &&
    options.template.startsWith(".") === false
  ) {
    throw Error(
      `\n Template ${options.template} is not available \n Please check webstudio --help for more details`
    );
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

  if (options.template !== "vanilla") {
    await copyTemplates(options.template);
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
      pages: new Map(siteData.pages.map((page) => [page.id, page])),
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

    siteDataByPage[page.path] = {
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

    componentsByPage[page.path] = new Set();
    for (const [_instanceId, instance] of instances) {
      if (instance.component === collectionComponent) {
        continue;
      }
      componentsByPage[page.path].add(instance.component);
      const meta = metas.get(instance.component);
      if (meta) {
        projectMetas.set(instance.component, meta);
      }
    }
  }

  const assetsToDownload: Promise<void>[] = [];
  const fontAssets: FontAsset[] = [];

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
        fontAssets.push(asset);
      }
    }
  }

  spinner.text = "Generating routes and pages";

  const routeFileTemplate = await readFile(
    normalize(
      join(
        dirname(fileURLToPath(new URL(import.meta.url))),
        "..",
        "templates",
        "route-template.tsx"
      )
    ),
    "utf8"
  );

  for (const [pathname, pageComponents] of Object.entries(componentsByPage)) {
    const scope = createScope([
      // manually maintained list of occupied identifiers
      "useState",
      "Fragment",
      "PageData",
      "Asset",
      "fontAssets",
      "pageData",
      "user",
      "projectId",
      "formsProperties",
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

    const pageData = siteDataByPage[pathname];
    // serialize data only used in runtime
    const renderedPageData: PageData = {
      project: siteData.build.pages.meta,
      page: pageData.page,
    };

    const rootInstanceId = pageData.page.rootInstanceId;
    const instances = new Map(pageData.build.instances);
    const props = new Map(pageData.build.props);
    const dataSources = new Map(pageData.build.dataSources);
    const resources = new Map(pageData.build.resources);
    const utilsExport = generateUtilsExport({
      pages: siteData.build.pages,
      props,
    });
    const pageComponent = generatePageComponent({
      scope,
      page: pageData.page,
      instances,
      props,
      dataSources,
      indexesWithinAncestors: getIndexesWithinAncestors(
        projectMetas,
        instances,
        [rootInstanceId]
      ),
    });

    const pageExports = `/* eslint-disable */
/* This is a auto generated file for building the project */ \n
import { Fragment, useState } from "react";
import type { PageData } from "~/routes/_index";
import type { Asset, ImageAsset, ProjectMeta } from "@webstudio-is/sdk";
${componentImports}
export const fontAssets: Asset[] = ${JSON.stringify(fontAssets)}
export const imageAssets: ImageAsset[] = ${JSON.stringify(imageAssets)}
export const pageData: PageData = ${JSON.stringify(renderedPageData)};
export const user: { email: string | null } | undefined = ${JSON.stringify(
      siteData.user
    )};
export const projectId = "${siteData.build.projectId}";

${pageComponent}

export { Page }

${generateRemixParams(pathname)}

${utilsExport}
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

    const remixRoute = generateRemixRoute(pathname);
    const fileName = `${remixRoute}.tsx`;

    const routeFileContent = routeFileTemplate
      .replace('../__generated__/index"', `../__generated__/${remixRoute}"`)
      .replace(
        '../__generated__/index.server"',
        `../__generated__/${remixRoute}.server"`
      );

    await ensureFileInPath(join(routesDir, fileName), routeFileContent);
    await ensureFileInPath(join(generatedDir, fileName), pageExports);

    await ensureFileInPath(
      join(generatedDir, `${remixRoute}.server.tsx`),
      generateResourcesLoader({
        scope,
        page: pageData.page,
        dataSources,
        resources,
      })
    );
  }

  spinner.text = "Generating css file";
  const cssText = generateCssText(
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
    }
  );
  await ensureFileInPath(join(generatedDir, "index.css"), cssText);

  await writeFile(
    join(generatedDir, "[sitemap.xml].ts"),
    `
      export const sitemap = ${JSON.stringify(
        {
          pages: siteData.pages
            .filter((page) => page.meta.excludePageFromSearch !== true)
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

  spinner.text = "Downloading fonts and images";
  await Promise.all(assetsToDownload);

  spinner.succeed("Build finished");
};
