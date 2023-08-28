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
var fs_utils_exports = {};
__export(fs_utils_exports, {
  ensureFileInPath: () => ensureFileInPath,
  ensureFolderExists: () => ensureFolderExists,
  loadJSONFile: () => loadJSONFile,
});
module.exports = __toCommonJS(fs_utils_exports);
var import_node_path = require("node:path");
var import_promises = require("node:fs/promises");
const ensureFileInPath = async (filePath, content) => {
  const dir = (0, import_node_path.dirname)(filePath);
  await ensureFolderExists(dir);
  try {
    await (0, import_promises.access)(filePath, import_promises.constants.F_OK);
  } catch {
    await (0, import_promises.writeFile)(filePath, content || "", "utf8");
  }
};
const ensureFolderExists = async (folderPath) => {
  try {
    await (0, import_promises.access)(
      folderPath,
      import_promises.constants.F_OK
    );
  } catch {
    await (0, import_promises.mkdir)(folderPath, { recursive: true });
  }
};
const loadJSONFile = async (filePath) => {
  try {
    const content = await (0, import_promises.readFile)(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};
