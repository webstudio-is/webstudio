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
var config_exports = {};
__export(config_exports, {
  ASSETS_BASE: () => ASSETS_BASE,
  GLOBAL_CONFIG_FILE: () => GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE: () => LOCAL_CONFIG_FILE,
  LOCAL_DATA_FILE: () => LOCAL_DATA_FILE,
});
module.exports = __toCommonJS(config_exports);
var import_node_path = require("node:path");
var import_env_paths = __toESM(require("env-paths"), 1);
const GLOBAL_CONFIG_FOLDER = (0, import_env_paths.default)("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
const GLOBAL_CONFIG_FILE = (0, import_node_path.join)(
  GLOBAL_CONFIG_FOLDER,
  GLOBAL_CONFIG_FILE_NAME
);
const LOCAL_CONFIG_FILE = ".webstudio/config.json";
const LOCAL_DATA_FILE = ".webstudio/data.json";
const ASSETS_BASE = "/assets/";
