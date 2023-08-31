import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { rm, mkdir, access, mkdtemp, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { cwd } from "node:process";
import {
  generateCssText,
  generateUtilsExport,
  type Params,
  type Data,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";
import {
  findTreeInstanceIds,
  type Instance,
  type Prop,
  type Build,
  type Page,
  DataSource,
} from "@webstudio-is/project-build";
import type { Asset, FontAsset } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as remixComponentMetas from "@webstudio-is/sdk-components-react-remix/metas";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";
import pLimit from "p-limit";
import ora from "ora";

import { templates } from "./__generated__/templates";
import { assets } from "./__generated__/assets";
import { getRouteTemplate } from "./__generated__/router";
import { ASSETS_BASE, LOCAL_DATA_FILE } from "./config";
import {
  ensureFileInPath,
  ensureFolderExists,
  loadJSONFile,
  parseFolderAndWriteFiles,
  parseFolderAndWriteAssets,
} from "./fs-utils";
import { getImageAttributes, createImageLoader } from "@webstudio-is/image";
import { pipeline } from "node:stream/promises";

const limit = pLimit(10);

type ComponentsByPage = {
  [path: string]: Set<string>;
};

type SiteDataByPage = {
  [path: string]: {
    page: Page;
    build: Pick<Build, "props" | "instances" | "dataSources" | "deployment">;
    assets: Array<Asset>;
    params?: Params;
    pages: Array<Page>;
  };
};

type RemixRoutes = {
  routes: Array<{
    path: string;
    file: string;
  }>;
};

export const downloadAsset = async (
  url: string,
  name: string,
  temporaryDir: string
) => {
  const assetPath = join("public", ASSETS_BASE, name);
  const tempAssetPath = join(temporaryDir, name);
  try {
    await access(assetPath);
  } catch {
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

export const prebuild = async () => {
  const spinner = ora("Scaffolding the project files");
  spinner.start();

  spinner.text = "Generating default files";
  await parseFolderAndWriteFiles(templates["defaults"], cwd());

  spinner.text = "Generating assets";
  await parseFolderAndWriteAssets(assets, cwd());

  const appRoot = "app";
  const routesDir = join(appRoot, "routes");
  await rm(routesDir, { recursive: true, force: true });
  await mkdir(routesDir, { recursive: true });

  const temporaryDir = await mkdtemp(join(tmpdir(), "webstudio-"));

  const generatedDir = join(appRoot, "__generated__");
  await rm(generatedDir, { recursive: true, force: true });
  await mkdir(generatedDir, { recursive: true });

  await ensureFolderExists(join("public", ASSETS_BASE));

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
    throw new Error(`Project domain is missing from the site data`);
  }

  const remixRoutes: RemixRoutes = {
    routes: [],
  };

  const componentsByPage: ComponentsByPage = {};
  const siteDataByPage: SiteDataByPage = {};

  for (const page of Object.values(siteData.pages)) {
    const originPath = page.path;
    const path = originPath === "" ? "index" : originPath.replace("/", "");

    if (path !== "index") {
      remixRoutes.routes.push({
        path: originPath === "" ? "/" : originPath,
        file: `routes/${path}.tsx`,
      });
    }

    const instanceMap = new Map(siteData.build.instances);
    const pageInstanceSet = findTreeInstanceIds(
      instanceMap,
      page.rootInstanceId
    );
    const instances: [Instance["id"], Instance][] =
      siteData.build.instances.filter(([id]) => pageInstanceSet.has(id));
    const dataSources: [DataSource["id"], DataSource][] = [];

    const props: [Prop["id"], Prop][] = [];
    for (const [_propId, prop] of siteData.build.props) {
      if (pageInstanceSet.has(prop.instanceId)) {
        props.push([prop.id, prop]);
      }
    }

    for (const [dataSourceId, dataSource] of siteData.build.dataSources) {
      if (
        dataSource.scopeInstanceId === undefined ||
        pageInstanceSet.has(dataSource.scopeInstanceId)
      ) {
        dataSources.push([dataSourceId, dataSource]);
      }
    }

    siteDataByPage[path] = {
      build: {
        props,
        instances,
        dataSources,
      },
      pages: siteData.pages,
      page,
      assets: siteData.assets,
    };

    componentsByPage[path] = new Set();
    for (const [_instanceId, instance] of instances) {
      if (instance.component) {
        componentsByPage[path].add(instance.component);
      }
    }
  }

  const radixComponentNamespacedMetas = Object.entries(
    radixComponentMetas
  ).reduce(
    (r, [name, meta]) => {
      r[`@webstudio-is/sdk-components-react-radix:${name}`] = meta;
      return r;
    },
    {} as Record<string, WsComponentMeta>
  );

  const componentMetas = new Map(
    Object.entries({
      ...baseComponentMetas,
      ...radixComponentNamespacedMetas,
      ...remixComponentMetas,
    })
  );

  const assetsToDownload: Promise<void>[] = [];
  const fontAssets: FontAsset[] = [];
  const assetBuildUrl = `https://${domain}.wstd.io/cgi/asset/`;

  for (const asset of siteData.assets) {
    if (asset.type === "image") {
      const image = getImageAttributes({
        /*
          TODO:
          https://github.com/webstudio-is/webstudio/issues/2135
          There should be a option in the loader, that allows to download
          original image instead of the processed one. Right now, we are using
          the width from the asset meta
        */
        width: asset.meta.width,
        optimize: true,
        src: asset.name,
        quality: 100,
        srcSet: undefined,
        sizes: undefined,
        loader: createImageLoader({
          imageBaseUrl: assetBuildUrl,
        }),
      });

      if (image?.src) {
        assetsToDownload.push(
          limit(() => downloadAsset(image.src, asset.name, temporaryDir))
        );
      }
    }

    if (asset.type === "font") {
      assetsToDownload.push(
        limit(() =>
          downloadAsset(
            `${assetBuildUrl}${asset.name}`,
            asset.name,
            temporaryDir
          )
        )
      );
      fontAssets.push(asset);
    }
  }

  spinner.text = "Generating routes and pages";
  for (const [pathName, pageComponents] of Object.entries(componentsByPage)) {
    const components = Array.from(pageComponents);
    const namespaces = new Map<string, Set<string>>();
    const DEFAULT_NAMESPACE = "@webstudio-is/sdk-components-react";
    let namespaceId = 0;
    const namespaceToId = new Map<string, number>();

    for (const component of components) {
      const nameArr = component.split(":");
      const [namespace, name] =
        nameArr.length === 1 ? [undefined, nameArr[0]] : nameArr;

      if (namespaces.has(namespace ?? DEFAULT_NAMESPACE) === false) {
        namespaces.set(namespace ?? DEFAULT_NAMESPACE, new Set<string>());
        namespaceToId.set(namespace ?? DEFAULT_NAMESPACE, namespaceId);
        namespaceId++;
      }

      namespaces.get(namespace ?? DEFAULT_NAMESPACE)?.add(name);
    }

    let componentImports = "";
    let assignComponent = "";
    for (const [namespace, componentsSet] of namespaces.entries()) {
      componentImports = `${componentImports}
import { ${Array.from(componentsSet)
        .map(
          (component) =>
            `${component} as ${component}_${namespaceToId.get(namespace)}`
        )
        .join(", ")} } from "${namespace}";`;

      if (namespace === DEFAULT_NAMESPACE) {
        assignComponent = `${assignComponent}
          ${Array.from(componentsSet)
            .map(
              (component) =>
                `"${component}": ${component}_${namespaceToId.get(namespace)}`
            )
            .join(",")},`;
      } else {
        assignComponent = `${assignComponent}
          ${Array.from(componentsSet)
            .map(
              (component) =>
                `"${namespace}:${component}": ${component}_${namespaceToId.get(
                  namespace
                )}`
            )
            .join(",")},`;
      }
    }

    const pageData = siteDataByPage[pathName];

    const utilsExport = generateUtilsExport({
      page: pageData.page,
      metas: componentMetas,
      instances: new Map(pageData.build.instances),
      props: new Map(pageData.build.props),
      dataSources: new Map(pageData.build.dataSources),
    });

    const pageExports = `/* eslint-disable camelcase */
/* eslint-disable prefer-const */
/* This is a auto generated file for building the project */ \n
import * as sdk from "@webstudio-is/react-sdk";
import type { PageData } from "~/routes/template";
import type { Components } from "@webstudio-is/react-sdk";
${componentImports}
import * as remixComponents from "@webstudio-is/sdk-components-react-remix";
export const components = new Map(Object.entries(Object.assign({ ${assignComponent} }, remixComponents ))) as Components;
export const fontAssets = ${JSON.stringify(fontAssets)}
export const pageData: PageData = ${JSON.stringify(pageData)};
export const user: { email: string | null } | undefined = ${JSON.stringify(
      siteData.user
    )};
export const projectId = "${siteData.build.projectId}";

${utilsExport}
`;

    const fileName =
      pathName === "main" || pathName === "index"
        ? "_index.tsx"
        : `${pathName.split("/").join(".")}._index.tsx`;

    let routeFile = getRouteTemplate();

    routeFile = routeFile.replace(
      "../__generated__/index",
      join("../__generated__", fileName)
    );

    await ensureFileInPath(join(routesDir, fileName), routeFile);
    await ensureFileInPath(join(generatedDir, fileName), pageExports);
  }

  spinner.text = "Generating css file";
  const cssText = generateCssText(
    {
      assets: siteData.assets,
      breakpoints: siteData.build?.breakpoints,
      styles: siteData.build?.styles,
      styleSourceSelections: siteData.build?.styleSourceSelections,
      componentMetas,
    },
    {
      assetBaseUrl: ASSETS_BASE,
    }
  );
  await ensureFileInPath(join(generatedDir, "index.css"), cssText);

  spinner.text = "Downloading fonts and images";
  await Promise.all(assetsToDownload);

  spinner.succeed("Build finished");
};
