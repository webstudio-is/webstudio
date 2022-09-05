#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */

require("esbuild-register/dist/node").register();
require("./engine").runCLI();
