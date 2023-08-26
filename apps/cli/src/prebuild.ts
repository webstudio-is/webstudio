import { join, relative, dirname } from "node:path";
import { createWriteStream, writeFileSync, mkdirSync } from "node:fs";
import { rm, mkdir, access, mkdtemp, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  generateCssText,
  generateUtilsExport,
  type Params,
  type Data,
} from "@webstudio-is/react-sdk";
import {
  findTreeInstanceIds,
  type Instance,
  type Prop,
  type Build,
  type Page,
  DataSource,
} from "@webstudio-is/project-build";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as remixComponentMetas from "@webstudio-is/sdk-components-react-remix/metas";
import type { Asset, FontAsset } from "@webstudio-is/asset-uploader";
import pLimit from "p-limit";
import ora from "ora";

import { getRouteTemplate } from "./__generated__/router";
import { ASSETS_BASE, LOCAL_DATA_FILE } from "./config";
import { ensureFolderExists, loadJSONFile } from "./fs-utils";
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
  const appRoot = "app";
  const componentsByPage: ComponentsByPage = {};
  const siteDataByPage: SiteDataByPage = {};

  const assetsToDownload: Promise<void>[] = [];
  const fontAssets: FontAsset[] = [];

  spinner.start();
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

  const assetBuildUrl = `https://${domain}.wstd.io/cgi/asset/`;

  for (const asset of siteData.assets) {
    if (asset.type === "image") {
      const image = getImageAttributes({
        /*
            TODO:
            https://github.com/webstudio-is/webstudio-builder/issues/2135
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

  const componentMetas = new Map(
    Object.entries({
      ...baseComponentMetas,
      ...remixComponentMetas,
    })
  );

  let cssText = generateCssText(
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

  cssText = `/* This file was generated by pnpm prebuild from /apps/edge-worker */\n${cssText}`;

  for (const [pathName, pageComponents] of Object.entries(componentsByPage)) {
    let relativePath = "../__generated__";

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

    const pageExports = `
    /* eslint-disable camelcase */
    /* eslint-disable prefer-const */
    // This file was generated by pnpm prebuild from /apps/edge-worker
    import * as sdk from "@webstudio-is/react-sdk";
    import type { PageData } from "~/routes/template";
    import type { Components } from "@webstudio-is/react-sdk";
    ${componentImports}
    import * as remixComponents from "@webstudio-is/sdk-components-react-remix";
    export const components = new Map(Object.entries(Object.assign({ ${assignComponent} }, remixComponents ))) as Components;
    export const fontAssets = ${JSON.stringify(fontAssets)};
    export const pageData: PageData = ${JSON.stringify(pageData)};
    export const user: { email: string | null } | undefined = ${JSON.stringify(
      siteData.user
    )};
    export const projectId = "${siteData.build.projectId}";

    ${utilsExport}
    `;

    /* Changing the pathName to index for the index page, so that remix will use the index.tsx file as index:true in the manifest file.

    It is generated by @remix-run/cloudflare somewhere here (https://github.com/remix-run/remix/blob/8851599c47f5d372fb537026a9ee0931a8753262/packages/remix-react/routes.tsx#L50). If there was no index.ts file, the manifest file containing all the routing was incorrect and nothing responded to root (/) requests. That is why the main file is renamed to index so Remix will use it as /.

    */
    pathName === "main" ? "index" : pathName;

    const fileLocationGeneratedDir = join(generatedDir, pathName);
    const fileLocationRoutesDir = join(routesDir, pathName);

    if (pathName !== "index") {
      // If the pathName is not index, we need to create the directory structure for the generated files, set the relative path to the generated directory
      if (!pathName.includes("/")) {
        mkdirSync(fileLocationGeneratedDir, { recursive: true });
        mkdirSync(fileLocationRoutesDir, { recursive: true });
        relativePath = relative(fileLocationRoutesDir, generatedDir);
      } else {
        const dirnameRoutesDir = dirname(fileLocationRoutesDir);
        relativePath = relative(dirnameRoutesDir, generatedDir);
      }
    }

    let dataFilePath = join(generatedDir, `${pathName}.ts`);
    let routeFilePath = join(routesDir, `${pathName}.tsx`);

    let replaceImport = `${relativePath}/${pathName}`;
    const replaceImportCss = `${relativePath}/index.css`;

    if (!pathName.includes("/") && pathName !== "index") {
      dataFilePath = join(fileLocationGeneratedDir, `index.ts`);
      routeFilePath = join(fileLocationRoutesDir, `index.tsx`);
      replaceImport = `${relativePath}/${pathName}/index`;
    }

    mkdirSync(dirname(dataFilePath), { recursive: true });
    writeFileSync(dataFilePath, pageExports, "utf8");

    let routeFile = getRouteTemplate();

    routeFile = routeFile.replace("../__generated__/index", replaceImport);
    routeFile = routeFile.replace(
      "../__generated__/index.css",
      replaceImportCss
    );

    mkdirSync(dirname(routeFilePath), { recursive: true });
    writeFileSync(routeFilePath, routeFile, "utf8");
  }

  writeFileSync(join(generatedDir, "index.css"), cssText, "utf8");
  spinner.text = "Downloading fonts and images";
  await Promise.all(assetsToDownload);

  spinner.succeed("Build finished");
};
