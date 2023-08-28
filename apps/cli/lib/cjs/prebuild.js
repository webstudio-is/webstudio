"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod
  )
);
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var prebuild_exports = {};
__export(prebuild_exports, {
  downloadAsset: () => downloadAsset,
  prebuild: () => prebuild,
});
module.exports = __toCommonJS(prebuild_exports);
var import_node_path = require("node:path");
var import_node_fs = require("node:fs");
var import_promises = require("node:fs/promises");
var import_node_os = require("node:os");
var import_react_sdk = require("@webstudio-is/react-sdk");
var import_project_build = require("@webstudio-is/project-build");
var baseComponentMetas = __toESM(
  require("@webstudio-is/sdk-components-react/metas"),
  1
);
var remixComponentMetas = __toESM(
  require("@webstudio-is/sdk-components-react-remix/metas"),
  1
);
var import_p_limit = __toESM(require("p-limit"), 1);
var import_ora = __toESM(require("ora"), 1);
var import_router = require("./__generated__/router");
var import_config = require("./config");
var import_fs_utils = require("./fs-utils");
var import_image = require("@webstudio-is/image");
var import_promises2 = require("node:stream/promises");
const limit = (0, import_p_limit.default)(10);
const downloadAsset = async (url, name, temporaryDir) => {
  const assetPath = (0, import_node_path.join)(
    "public",
    import_config.ASSETS_BASE,
    name
  );
  const tempAssetPath = (0, import_node_path.join)(temporaryDir, name);
  try {
    await (0, import_promises.access)(assetPath);
  } catch {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }
      const writableStream = (0, import_node_fs.createWriteStream)(
        tempAssetPath
      );
      await (0, import_promises2.pipeline)(response.body, writableStream);
      await (0, import_promises.rename)(tempAssetPath, assetPath);
    } catch (error) {
      console.error(`Error in downloading file ${name} 
 ${error}`);
    }
  }
};
const prebuild = async () => {
  const spinner = (0, import_ora.default)("Scaffolding the project files");
  const appRoot = "app";
  spinner.start();
  const routesDir = (0, import_node_path.join)(appRoot, "routes");
  await (0, import_promises.rm)(routesDir, { recursive: true, force: true });
  await (0, import_promises.mkdir)(routesDir, { recursive: true });
  const temporaryDir = await (0, import_promises.mkdtemp)(
    (0, import_node_path.join)((0, import_node_os.tmpdir)(), "webstudio-")
  );
  const generatedDir = (0, import_node_path.join)(appRoot, "__generated__");
  await (0, import_promises.rm)(generatedDir, { recursive: true, force: true });
  await (0, import_promises.mkdir)(generatedDir, { recursive: true });
  await (0, import_fs_utils.ensureFolderExists)(
    (0, import_node_path.join)("public", import_config.ASSETS_BASE)
  );
  const siteData = await (0, import_fs_utils.loadJSONFile)(
    import_config.LOCAL_DATA_FILE
  );
  if (siteData === null) {
    throw new Error(
      `Project data is missing, please make sure you the project is synced.`
    );
  }
  const domain = siteData.build.deployment?.projectDomain;
  if (domain === void 0) {
    throw new Error(`Project domain is missing from the site data`);
  }
  const remixRoutes = {
    routes: [],
  };
  const componentsByPage = {};
  const siteDataByPage = {};
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
    const pageInstanceSet = (0, import_project_build.findTreeInstanceIds)(
      instanceMap,
      page.rootInstanceId
    );
    const instances = siteData.build.instances.filter(([id]) =>
      pageInstanceSet.has(id)
    );
    const props = [];
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
    componentsByPage[path] = /* @__PURE__ */ new Set();
    for (const [_instanceId, instance] of instances) {
      if (instance.component) {
        componentsByPage[path].add(instance.component);
      }
    }
  }
  const assetsToDownload = [];
  const fontAssets = [];
  const assetBuildUrl = `https://${domain}.wstd.io/cgi/asset/`;
  for (const asset of siteData.assets) {
    if (asset.type === "image") {
      const image = (0, import_image.getImageAttributes)({
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
        srcSet: void 0,
        sizes: void 0,
        loader: (0, import_image.createImageLoader)({
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
    const utilsExport = (0, import_react_sdk.generateUtilsExport)({
      page: pageData.page,
      metas: componentMetas,
      instances: new Map(pageData.build.instances),
      props: new Map(pageData.build.props),
      dataSources: new Map(pageData.build.dataSources),
    });
    const pageExports = `/* This is a auto generated file for building the project */ 

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
    let routeFile = (0, import_router.getRouteTemplate)();
    routeFile = routeFile.replace(
      "../__generated__/index",
      (0, import_node_path.join)("../__generated__", fileName)
    );
    await (0, import_fs_utils.ensureFileInPath)(
      (0, import_node_path.join)(routesDir, fileName),
      routeFile
    );
    await (0, import_fs_utils.ensureFileInPath)(
      (0, import_node_path.join)(generatedDir, fileName),
      pageExports
    );
  }
  spinner.text = "Generating css file";
  const cssText = (0, import_react_sdk.generateCssText)(
    {
      assets: siteData.assets,
      breakpoints: siteData.build?.breakpoints,
      styles: siteData.build?.styles,
      styleSourceSelections: siteData.build?.styleSourceSelections,
      componentMetas,
    },
    {
      assetBaseUrl: import_config.ASSETS_BASE,
    }
  );
  await (0, import_fs_utils.ensureFileInPath)(
    (0, import_node_path.join)(generatedDir, "index.css"),
    cssText
  );
  spinner.text = "Downloading fonts and images";
  await Promise.all(assetsToDownload);
  spinner.succeed("Build finished");
};
