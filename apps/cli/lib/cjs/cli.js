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
var cli_exports = {};
__export(cli_exports, {
  main: () => main,
});
module.exports = __toCommonJS(cli_exports);
var import_node_util = require("node:util");
var import_node_process = require("node:process");
var import_config = require("./config");
var import_fs_utils = require("./fs-utils");
var import_link = require("./commands/link");
var import_sync = require("./commands/sync");
var import_build = require("./commands/build");
var import_args = require("./args");
var import_package = __toESM(require("../package.json"), 1);
const commands = {
  link: import_link.link,
  sync: import_sync.sync,
  build: import_build.build,
};
const main = async () => {
  try {
    await (0, import_fs_utils.ensureFileInPath)(
      import_config.GLOBAL_CONFIG_FILE,
      "{}"
    );
    const args = (0, import_node_util.parseArgs)({
      args: import_node_process.argv.slice(2),
      options: import_args.CLI_ARGS_OPTIONS,
      allowPositionals: true,
    });
    if (args.values?.version) {
      console.info(import_package.default.version);
      return;
    }
    if (args.values?.help) {
      (0, import_args.showHelp)();
      return;
    }
    const commandId = import_node_process.argv[2];
    const command = commands[commandId];
    if (command === void 0) {
      throw new Error(`No command provided`);
    }
    await command({ ...args, positionals: args.positionals.slice(1) });
  } catch (error) {
    console.error(error);
    (0, import_args.showHelp)();
    (0, import_node_process.exit)(1);
  }
};
