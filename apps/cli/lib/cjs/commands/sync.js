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
var sync_exports = {};
__export(sync_exports, {
  sync: () => sync,
});
module.exports = __toCommonJS(sync_exports);
var import_promises = require("node:fs/promises");
var import_node_process = require("node:process");
var import_node_path = require("node:path");
var import_ora = __toESM(require("ora"), 1);
var import_http_client = require("@webstudio-is/http-client");
var import_fs_utils = require("../fs-utils");
var import_config = require("../config");
const sync = async () => {
  const spinner = (0, import_ora.default)("Syncing project data").start();
  spinner.text = "Loading project data from config file";
  const globalConfig = await (0, import_fs_utils.loadJSONFile)(
    import_config.GLOBAL_CONFIG_FILE
  );
  if (globalConfig === null) {
    spinner.fail(
      `Global config file is not found. Please link your project using webstudio link command`
    );
    return;
  }
  const localConfig = await (0, import_fs_utils.loadJSONFile)(
    (0, import_node_path.join)(
      (0, import_node_process.cwd)(),
      import_config.LOCAL_CONFIG_FILE
    )
  );
  if (localConfig === null) {
    spinner.fail(
      `Local config file is not found. Please make sure current directory is a webstudio project`
    );
    return;
  }
  const { host, token } = globalConfig[localConfig.projectId];
  spinner.text = "Loading project data from webstudio";
  const project = await (0, import_http_client.loadProjectDataById)({
    projectId: localConfig.projectId,
    authToken: token,
    host,
  });
  spinner.text = "Saving project data to config file";
  const localBuildFilePath = (0, import_node_path.join)(
    (0, import_node_process.cwd)(),
    import_config.LOCAL_DATA_FILE
  );
  await (0, import_fs_utils.ensureFileInPath)(localBuildFilePath);
  await (0, import_promises.writeFile)(
    localBuildFilePath,
    JSON.stringify(project, null, 2),
    "utf8"
  );
  spinner.succeed("Project data synced successfully");
};
