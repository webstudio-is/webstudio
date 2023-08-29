import { join } from "node:path";
import { createWriteStream } from "node:fs";
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
} from "@webstudio-is/project-build";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as remixComponentMetas from "@webstudio-is/sdk-components-react-remix/metas";
import type { Asset, FontAsset } from "@webstudio-is/asset-uploader";
import pLimit from "p-limit";
import ora from "ora";

import { getRouteTemplate } from "./__generated__/router";
import { ASSETS_BASE, LOCAL_DATA_FILE } from "./config";
import { ensureFileInPath, ensureFolderExists, loadJSONFile } from "./fs-utils";
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

  const componentsByPage: ComponentsByPage = {};
  const siteDataByPage: SiteDataByPage = {};

  const componentMetas = new Map(
    Object.entries({ ...baseComponentMetas, ...remixComponentMetas })
  );

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

    const props: [Prop["id"], Prop][] = [];
    for (const [_propId, prop] of siteData.build.props) {
      if (pageInstanceSet.has(prop.instanceId)) {
        props.push([prop.id, prop]);
      }
    }

    siteDataByPage[path] = {
      build: {
        props,
        instances,
        dataSources: siteData.build.dataSources,
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
    const statements = Array.from(pageComponents).join(", ");
    const pageData = siteDataByPage[pathName];

    const utilsExport = generateUtilsExport({
      page: pageData.page,
      metas: componentMetas,
      instances: new Map(pageData.build.instances),
      props: new Map(pageData.build.props),
      dataSources: new Map(pageData.build.dataSources),
    });

    const pageExports = `/* This is a auto generated file for building the project */ \n
    import type { PageData } from "~/routes/template";
    import type { Components } from "@webstudio-is/react-sdk";
    import * as sdk from "@webstudio-is/react-sdk";
    import { ${statements} } from "@webstudio-is/sdk-components-react";
    import * as remixComponents from "@webstudio-is/sdk-components-react-remix";
    export const components = new Map(Object.entries(Object.assign({ ${statements} }, remixComponents ))) as Components;
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
