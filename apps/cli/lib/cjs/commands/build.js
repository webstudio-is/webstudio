"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var build_exports = {};
__export(build_exports, {
  build: () => build,
});
module.exports = __toCommonJS(build_exports);
var import_promises = require("node:fs/promises");
var import_node_process = require("node:process");
var import_node_path = require("node:path");
var import_fs_utils = require("../fs-utils");
var import_prebuild = require("../prebuild");
var import_templates = require("../__generated__/templates");
var import_config = require("../config");
const build = async () => {
  try {
    await (0, import_promises.access)(import_config.LOCAL_DATA_FILE);
    await parseFolderAndWriteFiles(
      import_templates.templates["defaults"],
      (0, import_node_process.cwd)()
    );
    await (0, import_prebuild.prebuild)();
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `You need to link a webstudio project before building it. Run \`webstudio link\` to link a project.`
      );
    }
    throw error;
  }
};
const parseFolderAndWriteFiles = async (folder, path) => {
  for (const file of folder.files) {
    const filePath = (0, import_node_path.join)(path, file.name);
    await (0, import_fs_utils.ensureFileInPath)(filePath);
    await (0, import_promises.writeFile)(filePath, file.content, "utf8");
  }
  for (const subFolder of folder.subFolders) {
    await parseFolderAndWriteFiles(
      subFolder,
      (0, import_node_path.join)(path, subFolder.name)
    );
  }
};
