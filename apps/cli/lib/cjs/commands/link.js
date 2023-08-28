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
var link_exports = {};
__export(link_exports, {
  link: () => link,
});
module.exports = __toCommonJS(link_exports);
var import_node_process = require("node:process");
var import_node_path = require("node:path");
var readline = __toESM(require("node:readline/promises"), 1);
var import_promises = require("node:fs/promises");
var import_config = require("../config");
var import_fs_utils = require("../fs-utils");
const link = async () => {
  const rl = readline.createInterface({
    input: import_node_process.stdin,
    output: import_node_process.stdout,
  });
  const shareLink = await rl.question(`Paste share link (with build access): `);
  const shareLinkUrl = new URL(shareLink);
  const host = shareLinkUrl.origin;
  const token = shareLinkUrl.searchParams.get("authToken");
  const paths = shareLinkUrl.pathname.split("/").slice(1);
  if (paths[0] !== "builder" || paths.length !== 2) {
    throw new Error("Invalid share link.");
  }
  const projectId = paths[1];
  if (token === void 0 || projectId === void 0 || host === void 0) {
    throw new Error("Invalid share link.");
  }
  try {
    const currentConfig = await (0, import_promises.readFile)(
      import_config.GLOBAL_CONFIG_FILE,
      "utf-8"
    );
    const currentConfigJson = JSON.parse(currentConfig);
    const newConfig = {
      ...currentConfigJson,
      [projectId]: {
        host,
        token,
      },
    };
    await (0, import_promises.writeFile)(
      import_config.GLOBAL_CONFIG_FILE,
      JSON.stringify(newConfig, null, 2)
    );
    rl.close();
    console.info(`Saved credentials for project ${projectId}.
  You can find your config at ${import_config.GLOBAL_CONFIG_FILE}
        `);
    await (0, import_fs_utils.ensureFileInPath)(
      (0, import_node_path.join)(
        (0, import_node_process.cwd)(),
        import_config.LOCAL_CONFIG_FILE
      ),
      JSON.stringify({ projectId }, null, 2)
    );
  } catch (error) {
    if (error.code === "ENONET") {
      throw new Error(`Global config file is not found`);
    }
    throw error;
  }
};
