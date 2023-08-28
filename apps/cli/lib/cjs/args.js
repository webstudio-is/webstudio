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
var args_exports = {};
__export(args_exports, {
  CLI_ARGS_OPTIONS: () => CLI_ARGS_OPTIONS,
  SupportedProjects: () => SupportedProjects,
  showHelp: () => showHelp,
});
module.exports = __toCommonJS(args_exports);
var import_node_util = require("node:util");
var import_strip_indent = __toESM(require("strip-indent"), 1);
const showHelp = () =>
  console.info(
    (0, import_strip_indent.default)(`
      Usage:
      $ webstudio commands [flags...]

      Commands:
      link       Link to an existing webstudio project
      sync       Sync the linked webstudio project with the latest build
      build      Build the linked webstudio project with a remix template.

     Flags:
     --help     -h     Show this help message
    --version  -v     Show the version of this script
`)
  );
const CLI_ARGS_OPTIONS = {
  version: {
    type: "boolean",
    short: "v",
  },
  help: {
    type: "boolean",
    short: "h",
  },
  type: {
    type: "string",
    short: "t",
    default: "defaults",
  },
};
const SupportedProjects = {
  defaults: true,
};
